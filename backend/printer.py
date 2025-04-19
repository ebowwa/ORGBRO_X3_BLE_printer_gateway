import asyncio
from bleak import BleakScanner, BleakClient
from PIL import Image

NUS_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
NUS_RX_CHAR_UUID    = "6e400002-b5a3-f393-e0a9-e50e24dcca9e"
ESC_INIT            = bytes([0x1B, 0x40])
GS_RASTER_CMD       = bytes([0x1D, 0x76, 0x30])

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

    def image_to_raster_bytes(self, image_path: str) -> bytes:
        img = Image.open(image_path).convert("1")  # 1-bit B/W
        width, height = img.size
        bytes_per_row = (width + 7) // 8
        xL, xH = bytes_per_row & 0xFF, (bytes_per_row >> 8) & 0xFF
        yL, yH = height & 0xFF, (height >> 8) & 0xFF

        raster = bytearray()
        raster.extend(GS_RASTER_CMD)
        raster.append(0x00)  # m = 0 (normal)
        raster.extend([xL, xH, yL, yH])

        pixels = img.load()
        for y in range(height):
            byte = 0
            for x in range(width):
                bit = 0 if pixels[x, y] else 1
                byte = (byte << 1) | bit
                if (x % 8) == 7:
                    raster.append(byte)
                    byte = 0
            if width % 8:
                byte <<= (8 - (width % 8))
                raster.append(byte)
        return bytes(raster)

    async def print_job(self, images, counts, order, density=127):
        await self.connect()
        await self.client.write_gatt_char(self.rx_char, ESC_INIT)
        # Set print density (TODO: allow models/users to specify per-pixel density adjustments for fine control)
        await self.client.write_gatt_char(self.rx_char, bytes([0x12, density]))

        for idx in order:
            raster = self.image_to_raster_bytes(images[idx])
            for _ in range(counts[idx]):
                await self.client.write_gatt_char(self.rx_char, raster)
                await self.client.write_gatt_char(self.rx_char, bytes([0x1B, 0x64, 3]))
