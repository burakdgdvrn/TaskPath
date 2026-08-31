from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List
import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.workspace import WorkspaceMember

router = APIRouter(prefix="/api/ws", tags=["websockets"])

class ConnectionManager:
    def __init__(self):
        # Maps user_id -> List[WebSocket]
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if len(self.active_connections[user_id]) == 0:
                del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            text_data = json.dumps(message)
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_text(text_data)
                except:
                    pass

    async def broadcast_to_workspace(self, workspace_id: str, message: dict, db: AsyncSession):
        members = await db.execute(select(WorkspaceMember.user_id).where(WorkspaceMember.workspace_id == workspace_id))
        user_ids = members.scalars().all()
        for uid in user_ids:
            await self.send_personal_message(message, uid)

manager = ConnectionManager()

@router.websocket("/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(websocket, user_id)
    try:
        while True:
            # We don't expect messages from the client in this basic implementation,
            # but we need to receive to keep the connection alive and detect disconnects.
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
