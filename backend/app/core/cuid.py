import time
import secrets

_counter = 0

def to_base36(num: int) -> str:
    chars = "0123456789abcdefghijklmnopqrstuvwxyz"
    if num == 0:
        return "0"
    res = []
    while num > 0:
        res.append(chars[num % 36])
        num //= 36
    return "".join(reversed(res))

def generate_cuid(prefix: str = "c") -> str:
    """
    Generate a collision-resistant unique identifier (CUID).
    Structure: prefix (1) + timestamp_b36 (~8) + counter_b36 (4) + entropy (8).
    Safe, URL-friendly, zero external dependencies.
    """
    global _counter
    _counter = (_counter + 1) % 1679616  # 36^4
    t = int(time.time() * 1000)
    time_part = to_base36(t)
    count_part = to_base36(_counter).rjust(4, "0")
    rand_part = secrets.token_hex(4)
    return f"{prefix}{time_part}{count_part}{rand_part}"
