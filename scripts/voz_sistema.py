import sys
import pyttsx3

def say_briefing(subject):
    engine = pyttsx3.init()
    engine.setProperty('rate', 150)
    
    msg = f"Comandante, novos neurônios de conhecimento sobre {subject} foram integrados à Fase 8. Memória Web sincronizada."
    print(f"[VOICE] {msg}")
    engine.say(msg)
    engine.runAndWait()

def say_custom(message):
    engine = pyttsx3.init()
    engine.setProperty('rate', 150)
    print(f"[VOICE] {message}")
    engine.say(message)
    engine.runAndWait()

if __name__ == "__main__":
    if len(sys.argv) > 1:
        text = " ".join(sys.argv[1:])
        if text.startswith("msg:"):
            say_custom(text[4:].strip())
        else:
            say_briefing(text)
    else:
        print("Usage: python voz_sistema.py [Subject] | msg:[Custom Message]")
