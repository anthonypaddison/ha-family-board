"""Family Board custom integration."""
from __future__ import annotations

from homeassistant.core import HomeAssistant

from .websocket import async_register_ws


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Set up the Family Board integration."""
    async_register_ws(hass)
    return True
