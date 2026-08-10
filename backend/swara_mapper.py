"""
swara_mapper.py

Defines the seven shuddha (natural) swaras, their associated body regions,
colours, and the logic to classify a detected frequency into a swara
relative to a calibrated Sa (tonic).
"""

import math
import time

# Semitone offsets are expressed relative to Sa, using the standard
# shuddha (natural) scale: Sa Re Ga Ma Pa Dha Ni -> 0 2 4 5 7 9 11
SWARAS = [
    {"name": "Sa", "semitone": 0, "body_part": "foot", "color": "#E63946"},
    {"name": "Re", "semitone": 2, "body_part": "knee", "color": "#F4A261"},
    {"name": "Ga", "semitone": 4, "body_part": "navel", "color": "#E9C46A"},
    {"name": "Ma", "semitone": 5, "body_part": "chest", "color": "#2A9D8F"},
    {"name": "Pa", "semitone": 7, "body_part": "neck", "color": "#457B9D"},
    {"name": "Dha", "semitone": 9, "body_part": "forehead", "color": "#6D5DAD"},
    {"name": "Ni", "semitone": 11, "body_part": "head", "color": "#B5179E"},
]

# Used until the user calibrates Sa. Middle C as a sane default.
DEFAULT_SA_FREQUENCY = 261.63

NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]


class SwaraMapper:
    def __init__(self, sa_frequency: float = DEFAULT_SA_FREQUENCY):
        self.sa_frequency = sa_frequency

    def set_sa(self, frequency: float):
        if frequency > 0:
            self.sa_frequency = frequency

    def frequency_to_note_name(self, frequency: float) -> str:
        semitones_from_a4 = 12 * math.log2(frequency / 440.0)
        rounded = int(round(semitones_from_a4))
        note_index = rounded % 12
        octave = 4 + (rounded + 9) // 12
        return f"{NOTE_NAMES[note_index]}{octave}"

    def classify(self, frequency: float, confidence: float, tolerance_semitones: float = 1.0):
        """
        Fold the detected frequency into the octave above Sa and find the
        nearest matching swara. Returns None if the pitch doesn't land close
        enough to any defined swara (guards against noise / off-pitch notes).

        Note: classification is octave-invariant by design (the fold below),
        so whichever octave the raw frequency was actually detected in has
        zero effect on which swara comes out -- only the raw note-name
        display is octave-sensitive.
        """
        if frequency is None or frequency <= 0 or self.sa_frequency <= 0:
            return None

        semitones_from_sa = 12 * math.log2(frequency / self.sa_frequency)
        semitone_in_octave = semitones_from_sa % 12

        closest = min(SWARAS, key=lambda s: abs(s["semitone"] - semitone_in_octave))
        distance = abs(closest["semitone"] - semitone_in_octave)
        distance = min(distance, 12 - distance)

        if distance > tolerance_semitones:
            return None

        return {
            "note": self.frequency_to_note_name(frequency),
            "frequency": round(frequency, 2),
            "swara": closest["name"],
            "body_part": closest["body_part"],
            "color": closest["color"],
            "confidence": round(confidence, 2),
            "timestamp": time.time(),
        }
