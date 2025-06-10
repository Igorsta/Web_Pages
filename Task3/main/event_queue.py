# main/event_queue.py
import queue
import threading
import json
import uuid

_client_queues_lock = threading.Lock()
_client_queues = {} # Storing queues by a unique client_id: {client_id: queue.Queue}

def add_client_queue():
    client_id = str(uuid.uuid4())
    q = queue.Queue(maxsize=100) # Give each client a buffer
    with _client_queues_lock:
        _client_queues[client_id] = q
    print(f"SSE [event_queue]: Client queue ADDED (ID: {client_id}). Total queues: {len(_client_queues)}")
    return client_id, q # Return the ID and the queue

def remove_client_queue(client_id: str):
    with _client_queues_lock:
        if client_id in _client_queues:
            del _client_queues[client_id]
            print(f"SSE [event_queue]: Client queue REMOVED (ID: {client_id}). Total queues: {len(_client_queues)}")
        else:
            print(f"SSE [event_queue]: WARN - Attempted to remove non-existent client queue (ID: {client_id}).")

def broadcast_event(event_type: str, data: dict):
    if not isinstance(event_type, str) or not isinstance(data, dict):
        print(f"SSE [event_queue] ERROR: Invalid event_type or data for broadcast. Type: {event_type}, Data: {data}")
        return

    sse_formatted_message = f"event: {event_type}\ndata: {json.dumps(data)}\n\n"
    print(f"SSE [event_queue]: Broadcasting event - Type: {event_type}, Data: {json.dumps(data).strip()}")

    # Iterate over a copy of the dictionary's items (client_id, queue)
    # This is safer if the dictionary might be modified concurrently (though lock should prevent it here)
    queues_to_notify = []
    with _client_queues_lock:
        queues_to_notify = list(_client_queues.items()) # List of (client_id, queue) tuples

    if not queues_to_notify:
        print("SSE [event_queue]: No active client queues to broadcast to.")
        return

    print(f"SSE [event_queue]: Number of client queues to broadcast to: {len(queues_to_notify)}")

    for client_id, q in queues_to_notify:
        try:
            # print(f"SSE [event_queue]: Attempting to put message in queue for client_id: {client_id}")
            q.put_nowait(sse_formatted_message) # Add message to this client's specific queue
            # print(f"SSE [event_queue]: Message put in queue for client_id: {client_id} successfully")
        except queue.Full:
            print(f"SSE [event_queue] WARNING: Client queue full for event '{event_type}' (Client ID: {client_id}). Message dropped for this client.")
            # Consider removing the queue/client if it's persistently full
            # remove_client_queue(client_id)
        except Exception as e:
            print(f"SSE [event_queue] ERROR: Failed to put message in queue for client_id {client_id}: {e}")