"""
pitch_detection.py

Fundamental-frequency estimator using normalized, FFT-accelerated
autocorrelation with parabolic interpolation for sub-sample accuracy.

Deliberately has NO octave-correction heuristic: swara classification folds
the detected frequency into a single octave relative to Sa (see
SwaraMapper.classify), so which octave we land on has zero effect on which
swara gets reported. An earlier attempt at "fixing" octave errors here
actually introduced its own errors on clean periodic tones -- simpler and
more reliable to just report the strongest peak in range as-is.
"""

import numpy as np


def detect_pitch(buffer: np.ndarray, sample_rate: int, fmin: float = 65.0, fmax: float = 1200.0):
    """
    Estimate the fundamental frequency of a mono audio buffer.

    Returns (frequency_hz, confidence) where confidence is in [0, 1].
    Returns (None, 0.0) if no clear pitch is found (silence/noise).
    """
    buffer = np.asarray(buffer, dtype=np.float64)
    buffer = buffer - np.mean(buffer)

    energy = np.sum(buffer ** 2)
    if energy < 1e-6:
        return None, 0.0

    size = len(buffer)
    fft_size = 1
    while fft_size < 2 * size:
        fft_size *= 2

    freq_domain = np.fft.rfft(buffer, fft_size)
    autocorr = np.fft.irfft(freq_domain * np.conj(freq_domain))
    autocorr = autocorr[:size]

    if autocorr[0] <= 0:
        return None, 0.0

    min_lag = int(sample_rate / fmax)
    max_lag = min(int(sample_rate / fmin), size - 1)

    if min_lag >= max_lag:
        return None, 0.0

    segment = autocorr[min_lag:max_lag]
    if len(segment) == 0:
        return None, 0.0

    peak_offset = np.argmax(segment)
    peak_index = peak_offset + min_lag
    peak_value = autocorr[peak_index]

    # Parabolic interpolation around the peak for sub-sample accuracy
    if 0 < peak_index < size - 1:
        left = autocorr[peak_index - 1]
        right = autocorr[peak_index + 1]
        denom = (left - 2 * peak_value + right)
        shift = 0.5 * (left - right) / denom if denom != 0 else 0.0
        refined_index = peak_index + shift
    else:
        refined_index = peak_index

    if refined_index <= 0:
        return None, 0.0

    confidence = float(peak_value / autocorr[0])
    confidence = max(0.0, min(1.0, confidence))

    frequency = sample_rate / refined_index
    return frequency, confidence
