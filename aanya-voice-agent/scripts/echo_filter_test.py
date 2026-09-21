"""Quick check: echo filter logic without loading Vosk (pure Python)."""
import time

from aanya.stt_vosk import VoskSTT

s = VoskSTT()
s.note_agent_speech("namaste main aanya bol rahi hoon grand horizon hotel se")
# Aanya echo (Devanagari of her own words) should be dropped
echo = "नमस्ते में आन्या बोल रही हूं ग्रैंड होराइज़न होटल से"
guest = "मुझे पंद्रह सितंबर से तीन रात के लिए डीलक्स रूम चाहिए"
print("echo dropped:", s._is_echo(echo), "(want True)")
print("guest kept :", s._is_echo(guest), "(want False)")
assert s._is_echo(echo), "echo was NOT dropped"
assert not s._is_echo(guest), "guest was wrongly dropped!"
print("ECHO FILTER OK")
