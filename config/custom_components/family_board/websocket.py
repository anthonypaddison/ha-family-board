"""Websocket handlers for Family Board config storage."""
from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.core import HomeAssistant
from homeassistant.components import websocket_api
from homeassistant.helpers.storage import Store

STORAGE_KEY = "family_board.config"
STORAGE_VERSION = 1


def _store(hass: HomeAssistant) -> Store:
    return Store(hass, STORAGE_VERSION, STORAGE_KEY)


@websocket_api.websocket_command({vol.Required("type"): "family_board/config/get"})
@websocket_api.async_response
async def ws_get_config(hass: HomeAssistant, connection, msg: dict) -> None:
    """Return stored Family Board config."""
    config = await _store(hass).async_load()
    connection.send_result(msg["id"], {"config": config})


@websocket_api.websocket_command(
    {vol.Required("type"): "family_board/config/set", vol.Required("config"): dict}
)
@websocket_api.async_response
async def ws_set_config(hass: HomeAssistant, connection, msg: dict) -> None:
    """Save Family Board config."""
    config: dict[str, Any] = msg.get("config") or {}
    await _store(hass).async_save(config)
    connection.send_result(msg["id"], {"ok": True})


def async_register_ws(hass: HomeAssistant) -> None:
    """Register websocket commands."""
    websocket_api.async_register_command(hass, ws_get_config)
    websocket_api.async_register_command(hass, ws_set_config)
