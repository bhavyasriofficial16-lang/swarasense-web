"""
main.py

FastAPI backend for SwaraSense. Exposes:
  - GET  /                     current status + calibrated Sa frequency
  - POST /calibrate             recalibrate Sa to a given frequency (manual)
  - WS   /ws/audio               [local dev only] server captures its OWN
                                  machine's mic via sounddevice -- has no
                                  effect once deployed to a cloud server,
                                  since there's no physical mic attached there
  - WS   /ws/mobile-audio        [browser / phone] the CLIENT captures mic
                                  audio and pushes small PCM chunks up to
                                  this socket; the server runs pitch
                                  detection on each chunk and streams back
                                  results. This is what the deployed PWA uses.

Run with:  uvicorn main:app --reload --port 8000
"""

import asyncio
import base64
import json
import queue

import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from pitch_detection import detect_pitch
from swara_mapper import SwaraMapper

SAMPLE_RATE = 44100
BLOCK_SIZE = 2048
CONFIDENCE_THRESHOLD = 0.6

app = FastAPI(title="SwaraSense Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten to your deployed frontend origin before sharing widely
    allow_methods=["*"],
    allow_headers=["*"],
)

mapper = SwaraMapper()


class CalibrateRequest(BaseModel):
    frequency: float


@app.get("/")
def root():
    return {
        "status": "SwaraSense backend running",
        "sa_frequency": mapper.sa_frequency,
    }


@app.post("/calibrate")
def calibrate(payload: CalibrateRequest):
    mapper.set_sa(payload.frequency)
    return {"status": "calibrated", "sa_frequency": mapper.sa_frequency}


@app.websocket("/ws/audio")
async def audio_stream(websocket: WebSocket):
    """Server-side mic capture -- only meaningful when running locally on
    the same machine you're testing from. Not usable once deployed."""
    import sounddevice as sd

    await websocket.accept()
    audio_q: "queue.Queue" = queue.Queue()

    def callback(indata, frames, time_info, status):
        audio_q.put(indata[:, 0].copy())

    stream = sd.InputStream(
        channels=1, samplerate=SAMPLE_RATE, blocksize=BLOCK_SIZE, callback=callback
    )
    loop = asyncio.get_event_loop()

    try:
        stream.start()
        while True:
            block = await loop.run_in_executor(None, audio_q.get)
            frequency, confidence = detect_pitch(block, SAMPLE_RATE)
            if frequency is None or confidence < CONFIDENCE_THRESHOLD:
                continue
            result = mapper.classify(frequency, confidence)
            if result:
                await websocket.send_text(json.dumps(result))
    except WebSocketDisconnect:
        pass
    finally:
        stream.stop()
        stream.close()


@app.websocket("/ws/mobile-audio")
async def client_audio_stream(websocket: WebSocket):
    """Client-pushed audio -- used by the deployed web app (browser mic via
    Web Audio API) and the React Native mobile app. Messages look like:

        {"audio": "<base64 16-bit PCM mono>", "sampleRate": 44100, "calibrate": false}

    If "calibrate" is true, the next confidently-detected frequency is
    captured directly as the new Sa (bypassing classification) instead of
    being turned into a swara -- powers the "tap, then play Sa" flow, no
    manual frequency typing involved."""
    await websocket.accept()

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                payload = json.loads(raw)
                audio_b64 = payload["audio"]
                sample_rate = int(payload.get("sampleRate", SAMPLE_RATE))
                calibrate_requested = bool(payload.get("calibrate", False))
            except (KeyError, ValueError, json.JSONDecodeError):
                continue

            try:
                pcm_bytes = base64.b64decode(audio_b64)
            except Exception:
                continue

            samples = np.frombuffer(pcm_bytes, dtype=np.int16).astype(np.float32) / 32768.0
            if samples.size == 0:
                continue

            # Everything from here on touches floating-point math (log2 in
            # the mapper, division in pitch detection) that could in theory
            # throw on a pathological chunk (e.g. all-NaN audio from a
            # brief mic glitch). Without this guard, one bad chunk would
            # crash the whole connection handler -- the socket closes, and
            # while the frontend does auto-reconnect, it's a jarring gap in
            # a live demo. Better to log and skip just that one chunk.
            try:
                frequency, confidence = detect_pitch(samples, sample_rate)
                if frequency is None or confidence < CONFIDENCE_THRESHOLD:
                    continue

                if calibrate_requested:
                    mapper.set_sa(frequency)
                    await websocket.send_text(json.dumps({
                        "type": "calibration_result",
                        "sa_frequency": round(mapper.sa_frequency, 2),
                    }))
                    continue

                result = mapper.classify(frequency, confidence)
                if result:
                    result["type"] = "detection"
                    await websocket.send_text(json.dumps(result))
            except Exception as exc:
                print(f"Skipping bad audio chunk: {exc}")
                continue

    except WebSocketDisconnect:
        pass


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_excludes=["venv/*", "**/venv/*"],
    )