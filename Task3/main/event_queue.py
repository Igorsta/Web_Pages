# main/event_queue.py
import queue
import threading
import json
import uuid

_client_queues = {}  # Dictionary: {client_id: queue.Queue}
_client_queues_lock = threading.Lock()

def add_client_queue():
    client_id = str(uuid.uuid4())
    q = queue.Queue(maxsize=100)
    with _client_queues_lock:
        _client_queues[client_id] = q
    print(f"SSE [event_queue]: Client queue added (ID: {client_id}). Total queues: {len(_client_queues)}")
    return client_id, q

def remove_client_queue(client_id: str):
    with _client_queues_lock:
        if client_id in _client_queues:
            del _client_queues[client_id]
            print(f"SSE [event_queue]: Client queue removed (ID: {client_id}). Total queues: {len(_client_queues)}")
        else:
            print(f"SSE [event_queue]: Attempted to remove non-existent client queue (ID: {client_id}).")

def broadcast_event(event_type: str, data: dict):
    if not isinstance(event_type, str) or not isinstance(data, dict):
        print(f"SSE [event_queue] ERROR: Invalid event_type or data for broadcast. Type: {event_type}, Data: {data}")
        return

    sse_formatted_message = f"event: {event_type}\ndata: {json.dumps(data)}\n\n"
    print(f"SSE [event_queue]: Broadcasting event - Type: {event_type}, Data: {json.dumps(data)}")

    current_client_ids = []
    with _client_queues_lock:
        current_client_ids = list(_client_queues.keys())

    if not current_client_ids:
        print("SSE [event_queue]: No active client queues to broadcast to.")
        return

    print(f"SSE [event_queue]: Number of client queues to broadcast to: {len(current_client_ids)}")

    for client_id in current_client_ids:
        with _client_queues_lock:
            q = _client_queues.get(client_id)
        
        if q:
            try:
                print(f"SSE [event_queue]: Attempting to put message in queue for client_id: {client_id}")
                q.put_nowait(sse_formatted_message)
                print(f"SSE [event_queue]: Message put in queue for client_id: {client_id} successfully")
            except queue.Full:
                print(f"SSE [event_queue] WARNING: Client queue full for event '{event_type}' (Client ID: {client_id}). Message dropped for this client.")
            except Exception as e:
                print(f"SSE [event_queue] ERROR: Failed to put message in queue for client_id {client_id}: {e}")
        else:
            print(f"SSE [event_queue] WARNING: Queue for client_id {client_id} not found during broadcast (race condition?).")