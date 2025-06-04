import os
import binascii
print(binascii.hexlify(os.urandom(32)).decode()) # Generates a 64-character hex string