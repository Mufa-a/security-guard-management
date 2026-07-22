"""
Kenyan statutory payroll rates and bands — 2026.

IMPORTANT: these change periodically (NSSF limits last changed February
2026; PAYE bands change via Finance Acts). Update ONLY this file when
rates change — nothing else in the payroll app should hardcode a number.

This is not tax advice — verify against KRA / NSSF / SHIF guidance before
running a live payroll cycle.
"""

from decimal import Decimal

# ---------------------------------------------------------------------------
# PAYE — monthly tax bands. Each tuple: (lower bound, upper bound or None, rate)
# ---------------------------------------------------------------------------
PAYE_BANDS = [
    (Decimal("0"), Decimal("24000"), Decimal("0.10")),
    (Decimal("24000"), Decimal("32333"), Decimal("0.25")),
    (Decimal("32333"), Decimal("500000"), Decimal("0.30")),
    (Decimal("500000"), Decimal("800000"), Decimal("0.325")),
    (Decimal("800000"), None, Decimal("0.35")),
]

PERSONAL_RELIEF = Decimal("2400")  # monthly, resident individuals

# ---------------------------------------------------------------------------
# NSSF — effective February 2026 (Year 4, NSSF Act No. 45 of 2013 rollout)
# ---------------------------------------------------------------------------
NSSF_LOWER_EARNINGS_LIMIT = Decimal("9000")
NSSF_UPPER_EARNINGS_LIMIT = Decimal("108000")
NSSF_RATE = Decimal("0.06")  # employee share; employer matches equally

# ---------------------------------------------------------------------------
# SHIF (replaced NHIF)
# ---------------------------------------------------------------------------
SHIF_RATE = Decimal("0.0275")  # 2.75% of gross pay

# ---------------------------------------------------------------------------
# Affordable Housing Levy
# ---------------------------------------------------------------------------
HOUSING_LEVY_RATE = Decimal("0.015")  # 1.5% of gross pay