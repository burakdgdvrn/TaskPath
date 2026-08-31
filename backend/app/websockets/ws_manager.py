from fastapi import WebSocket
from typing import Dict, List
import json


class ConnectionManager:
    """Manages WebSocket connections per board."""

    def __init__(self):
        # board_id -> list of (ws, user_id, display_name, avatar_color)
        self.active_connections: Dict[str, List[dict]] = {}

    async def connect(self, websocket: WebSocket, board_id: str, user_id: str, display_name: str, avatar_color: str):
        await websocket.accept()
        if board_id not in self.active_connections:
            self.active_connections[board_id] = []
        conn = {
            "ws": websocket,
            "user_id": user_id,
            "display_name": display_name,
            "avatar_color": avatar_color,
        }
        self.active_connections[board_id].append(conn)

        # Notify others that user joined
        await self.broadcast(board_id, {
            "type": "user:joined",
            "user_id": user_id,
            "display_name": display_name,
            "avatar_color": avatar_color,
        }, exclude=user_id)

        # Send current online users to the joining user
        online_users = [
            {"user_id": c["user_id"], "display_name": c["display_name"], "avatar_color": c["avatar_color"]}
            for c in self.active_connections.get(board_id, [])
        ]
        await websocket.send_json({"type": "users:online", "users": online_users})

    async def disconnect(self, websocket: WebSocket, board_id: str, user_id: str):
        if board_id in self.active_connections:
            self.active_connections[board_id] = [
                c for c in self.active_connections[board_id] if c["ws"] != websocket
            ]
            if not self.active_connections[board_id]:
                del self.active_connections[board_id]

        await self.broadcast(board_id, {
            "type": "user:left",
            "user_id": user_id,
        })

    async def broadcast(self, board_id: str, message: dict, exclude: str | None = None):
        """Send message to all connections in a board except the excluded user."""
        if board_id not in self.active_connections:
            return

        disconnected = []
        for conn in self.active_connections[board_id]:
            if exclude and conn["user_id"] == exclude:
                continue
            try:
                await conn["ws"].send_json(message)
            except Exception:
                disconnected.append(conn)

        # Clean up disconnected
        if disconnected and board_id in self.active_connections:
            self.active_connections[board_id] = [
                c for c in self.active_connections[board_id] if c not in disconnected
            ]
            if not self.active_connections[board_id]:
                del self.active_connections[board_id]


manager = ConnectionManager()
