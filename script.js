document.addEventListener('DOMContentLoaded', () => {
  const textSpan = document.getElementById('text-span');
  const rateInput = document.getElementById('rate-input');
  const voiceList = document.getElementById('voice-list');
  const speakBtn = document.getElementById('speak-btn');
  const pauseBtn = document.getElementById('pause-btn');
  const stopBtn = document.getElementById('stop-btn');
  const rateValue = document.getElementById('rate-value');
  const loading = document.getElementById('loading');
  const synth = window.speechSynthesis;
  let voices = [];
  let textInput = '';
  let wordPositions = [];
  let currentHighlightedIndex = -1;

  let loaded = 0;
  let hl = 0;

  rateValue.textContent = rateInput.value;
  rateInput.onchange = () => {
    rateValue.textContent = rateInput.value;
  }

  const loadText = async (file, start = 0, length = 5000) => {
    loading.style.display = 'block';
    const response = await fetch(file);
    const reader = response.body.getReader();
    let decoder = new TextDecoder();
    let result = '';
    let done = false;
    let chunkStart = start;

    while (!done && chunkStart < start + length) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      if (value) {
        result += decoder.decode(value, { stream: !done });
        chunkStart += value.length;
      }
    }

    loaded++

    return result;
  };

  const getVoices = () => {
    voices = synth.getVoices();
    voiceList.innerHTML = '';
    voices.forEach(voice => {
      const option = document.createElement('option');
      option.textContent = `${voice.name} (${voice.lang})`;
      option.setAttribute('data-lang', voice.lang);
      option.setAttribute('data-name', voice.name);
      voiceList.appendChild(option);
    });
  };

  if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = getVoices;
  }

  const highlightWords = (text) => {
    const wordRegex = /\S+/g;
    let match;
    textSpan.innerHTML = '';
    let wordIndex = 0;
    wordPositions = [];

    const lines = text.split('\n');
    lines.forEach((line, lineIndex) => {
      while ((match = wordRegex.exec(line)) !== null) {
        const span = document.createElement('span');
        span.textContent = match[0] + ' ';
        span.id = 'word-' + wordIndex;
        textSpan.appendChild(span);
        wordPositions.push({ index: wordIndex, charIndex: match.index + (lineIndex ? lines.slice(0, lineIndex).join('\n').length + lineIndex : 0) });
        wordIndex++;
      }
      if (lineIndex < lines.length - 1) {
        textSpan.appendChild(document.createElement('br'));
      }
    });

    hl++
    loading.style.display = 'none';
    textSpan.style.display = 'block';
  };

  const highlightCurrentWord = (index) => {
    if (currentHighlightedIndex !== -1) {
      document.getElementById('word-' + currentHighlightedIndex).classList.remove('highlight');
    }
    const span = document.getElementById('word-' + index);
    if (span) {
      span.classList.add('highlight');
    }
    currentHighlightedIndex = index;
  };

  speakBtn.addEventListener('click', async e => {
    e.preventDefault();
    if (synth.speaking) {
      synth.resume();
    } else {
      textInput = textInput !== '' ? textInput : await loadText('./hp.txt');
      if (textInput !== '') {
        if (loaded !== hl) {
          highlightWords(textInput);
        }
        const speakText = new SpeechSynthesisUtterance(textInput);
        speakText.rate = rateInput.value;
        const selectedVoice = voiceList.selectedOptions[0].getAttribute('data-name');
        voices.forEach(voice => {
          if (voice.name === selectedVoice) {
            speakText.voice = voice;
          }
        });

        speakText.onboundary = (event) => {
          if (event.name === 'word' && event.charIndex !== undefined) {
            const currentCharIndex = event.charIndex;
            let currentWordIndex = 0;

            for (let i = 0; i < wordPositions.length; i++) {
              if (wordPositions[i].charIndex <= currentCharIndex) {
                currentWordIndex = wordPositions[i].index;
              } else {
                break;
              }
            }

            highlightCurrentWord(currentWordIndex);
          }
        };

        synth.speak(speakText);
      }
    }
  });

  pauseBtn.addEventListener('click', e => {
    e.preventDefault();
    synth.pause();
  });

  stopBtn.addEventListener('click', e => {
    e.preventDefault();
    synth.cancel();
    if (currentHighlightedIndex !== -1) {
      document.getElementById('word-' + currentHighlightedIndex).classList.remove('highlight');
      currentHighlightedIndex = -1;
    }
  });

  getVoices();
});
