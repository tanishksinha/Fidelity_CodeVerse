import socketio
import asyncio

sio = socketio.AsyncClient()

@sio.event
async def connect():
    print("Connected to server!")

@sio.event
async def receive_nudge(data):
    print("NUDGE RECEIVED:", data)
    await sio.disconnect()

@sio.event
async def connect_error(err):
    print("Connection failed:", err)

async def main():
    try:
        await sio.connect('http://localhost:8080', transports=['websocket'])
        await sio.wait()
    except Exception as e:
        print("Error:", e)

if __name__ == '__main__':
    asyncio.run(main())
