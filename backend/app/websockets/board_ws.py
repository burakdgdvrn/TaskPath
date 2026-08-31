from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from sqlalchemy import select
from app.database import async_session
from app.models.user import User
from app.services.auth_service import decode_access_token
from app.websockets.ws_manager import manager

router = APIRouter()


@router.websocket("/ws/board/{board_id}")
async def board_websocket(
    websocket: WebSocket,
    board_id: str,
    token: str = Query(None),
):
    # Authenticate via query param token
    if not token:
        await websocket.close(code=4001, reason="Token gerekli")
        return

    payload = decode_access_token(token)
    if not payload:
        await websocket.close(code=4001, reason="Geçersiz token")
        return

    user_id = payload.get("sub")

    # Get user info
    async with async_session() as db:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            await websocket.close(code=4001, reason="Kullanıcı bulunamadı")
            return
        display_name = user.display_name
        avatar_color = user.avatar_color

    await manager.connect(websocket, board_id, user_id, display_name, avatar_color)

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type", "")

            # Cursor movement — relay to others
            if msg_type == "cursor:move":
                await manager.broadcast(board_id, {
                    "type": "cursor:move",
                    "user_id": user_id,
                    "display_name": display_name,
                    "avatar_color": avatar_color,
                    "x": data.get("x", 0),
                    "y": data.get("y", 0),
                }, exclude=user_id)

            # Node/edge CRUD events — relay to others for live sync
            elif msg_type in (
                "node:create", "node:update", "node:delete", "node:move",
                "edge:create", "edge:delete",
            ):
                await manager.broadcast(board_id, {
                    **data,
                    "user_id": user_id,
                }, exclude=user_id)

    except WebSocketDisconnect:
        await manager.disconnect(websocket, board_id, user_id)
    except Exception:
        await manager.disconnect(websocket, board_id, user_id)
