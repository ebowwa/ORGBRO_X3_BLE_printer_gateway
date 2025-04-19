import asyncio
from bleak import BleakScanner, BleakClient
from PIL import Image
import numpy as np
from densityxpixel import create_density_map

NUS_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
NUS_RX_CHAR_UUID    = "6e400002-b5a3-f393-e0a9-e50e24dcca9e"
NUS_TX_CHAR_UUID    = "6e400003-b5a3-f393-e0a9-e50e24dcca9e"
BATTERY_SERVICE_UUID        = "0000180f-0000-1000-8000-00805f9b34fb"
BATTERY_LEVEL_CHAR_UUID     = "00002a19-0000-1000-8000-00805f9b34fb"
DEVICE_INFO_SERVICE_UUID    = "0000180a-0000-1000-8000-00805f9b34fb"
MODEL_NUMBER_CHAR_UUID      = "00002a24-0000-1000-8000-00805f9b34fb"
FIRMWARE_REV_CHAR_UUID      = "00002a26-0000-1000-8000-00805f9b34fb"
ESC_INIT            = bytes([0x1B, 0x40])
GS_RASTER_CMD       = bytes([0x1D, 0x76, 0x30])
GS_CUT_FULL         = bytes([0x1D, 0x56, 0x00])
GS_CUT_PARTIAL      = bytes([0x1D, 0x56, 0x01])
DLE_EOT             = bytes([0x10, 0x04])  # status request base
FEED = lambda n: bytes([0x1B, 0x64, n])

class BlePrinter:
    def __init__(self, address):
        self.address = address
        self.client = None
        self.rx_char = None

    @staticmethod
    def scan():
        """Synchronously scan for ORGBRO printers and return list of dicts."""
        return asyncio.run(BlePrinter._scan_async())

    @staticmethod
    async def _scan_async():
        found = []
        devices = await BleakScanner.discover()
        for d in devices:
            if d.name and "ORGBRO" in d.name:
                found.append({'name': d.name, 'address': d.address})
        return found

    async def connect(self):
        if self.client and self.client.is_connected:
            return
        self.client = BleakClient(self.address)
        await self.client.connect()
        svc = await self.client.get_service(NUS_SERVICE_UUID)
        self.rx_char = svc.get_characteristic(NUS_RX_CHAR_UUID)

    async def subscribe_notifications(self, callback):
        """Subscribe to NUS TX notifications."""
        await self.connect()
        await self.client.start_notify(NUS_TX_CHAR_UUID, callback)

    def image_to_raster_bytes(self, image_path: str, density=127) -> bytes:
        img = Image.open(image_path).convert("L")
        arr = np.array(img)
        # support per-pixel density arrays or scalar fallback
        if isinstance(density, np.ndarray):
            dm = density
        else:
            dm = np.full(arr.shape, density, dtype=np.uint8)
        bw = (arr < dm).astype(np.uint8)
        H, W = bw.shape
        pad = (-W) % 8
        if pad:
            bw = np.pad(bw, ((0,0),(0,pad)), constant_values=0)
            W += pad
        packed = np.packbits(bw, axis=1)
        bytes_per_row = packed.shape[1]
        xL, xH = bytes_per_row & 0xFF, bytes_per_row >> 8
        yL, yH = H & 0xFF, H >> 8
        raster = bytearray(GS_RASTER_CMD + b'\x00' + bytes([xL, xH, yL, yH]))
        raster.extend(packed.flatten().tolist())
        return bytes(raster)

    async def print_job(self, images, counts, order, density=127):
        await self.connect()
        await self.client.write_gatt_char(self.rx_char, ESC_INIT)
        # Set print density (scalar fallback)
        await self.client.write_gatt_char(self.rx_char, bytes([0x12, density]))

        # build per-image density maps for pixel-level thresholds
        density_maps = [create_density_map(path, density) for path in images]

        for idx in order:
            # include density map when generating raster bytes
            raster = self.image_to_raster_bytes(images[idx], density_maps[idx])
            for _ in range(counts[idx]):
                await self.client.write_gatt_char(self.rx_char, raster)
                await self.client.write_gatt_char(self.rx_char, bytes([0x1B, 0x64, 3]))

    async def read_battery_level(self) -> int:
        """Read battery level from printer."""
        if not self.client or not self.client.is_connected:
            await self.connect()
        svc = await self.client.get_service(BATTERY_SERVICE_UUID)
        char = svc.get_characteristic(BATTERY_LEVEL_CHAR_UUID)
        data = await self.client.read_gatt_char(char)
        return int(data[0])

    async def get_device_info(self) -> dict:
        """Read model number and firmware revision."""
        if not self.client or not self.client.is_connected:
            await self.connect()
        svc = await self.client.get_service(DEVICE_INFO_SERVICE_UUID)
        model_c = svc.get_characteristic(MODEL_NUMBER_CHAR_UUID)
        fw_c = svc.get_characteristic(FIRMWARE_REV_CHAR_UUID)
        model = (await self.client.read_gatt_char(model_c)).decode().strip("\x00")
        fw = (await self.client.read_gatt_char(fw_c)).decode().strip("\x00")
        return {'model': model, 'firmware': fw}
