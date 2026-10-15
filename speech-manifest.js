(function(root){
"use strict";
const library={
  "version": 1,
  "syllables": {
    "ЛА": {
      "file": "audio/speech/syllable-41b-410.mp3",
      "speaker": "OpenLearn course narrator",
      "source": "https://www.open.edu/openlearn/mod/oucontent/view.php?id=137234&section=8.1",
      "license": "CC BY-NC-SA 4.0",
      "ready": true,
      "start": 189.391542,
      "end": 190.161655,
      "sourceFile": "audio/speech/sources/audio-week4.mp3"
    },
    "ЛО": {
      "file": "audio/speech/syllable-41b-41e.mp3",
      "speaker": "OpenLearn course narrator",
      "source": "https://www.open.edu/openlearn/mod/oucontent/view.php?id=137234&section=8.1",
      "license": "CC BY-NC-SA 4.0",
      "ready": true,
      "start": 192.459478,
      "end": 193.253265,
      "sourceFile": "audio/speech/sources/audio-week4.mp3"
    },
    "ЛУ": {
      "file": "audio/speech/syllable-41b-423.mp3",
      "speaker": "OpenLearn course narrator",
      "source": "https://www.open.edu/openlearn/mod/oucontent/view.php?id=137234&section=8.1",
      "license": "CC BY-NC-SA 4.0",
      "ready": true,
      "start": 195.734195,
      "end": 196.489093,
      "sourceFile": "audio/speech/sources/audio-week4.mp3"
    },
    "ЛИ": {
      "file": "audio/speech/syllable-41b-418.mp3",
      "speaker": "OpenLearn course narrator",
      "source": "https://www.open.edu/openlearn/mod/oucontent/view.php?id=137234&section=8.1",
      "license": "CC BY-NC-SA 4.0",
      "ready": true,
      "start": 202.258186,
      "end": 202.976327,
      "sourceFile": "audio/speech/sources/audio-week4.mp3"
    },
    "ЛІ": {
      "file": "audio/speech/syllable-41b-406.mp3",
      "speaker": "OpenLearn course narrator",
      "source": "https://www.open.edu/openlearn/mod/oucontent/view.php?id=137234&section=8.1",
      "license": "CC BY-NC-SA 4.0",
      "ready": true,
      "start": 205.470998,
      "end": 206.235488,
      "sourceFile": "audio/speech/sources/audio-week4.mp3"
    },
    "МА": {
      "file": "audio/speech/syllable-41c-410.mp3",
      "speaker": "OpenLearn course narrator",
      "source": "https://www.open.edu/openlearn/mod/oucontent/view.php?id=137234&section=8.1",
      "license": "CC BY-NC-SA 4.0",
      "ready": true,
      "start": 209.469342,
      "end": 210.165283,
      "sourceFile": "audio/speech/sources/audio-week4.mp3"
    },
    "МО": {
      "file": "audio/speech/syllable-41c-41e.mp3",
      "speaker": "OpenLearn course narrator",
      "source": "https://www.open.edu/openlearn/mod/oucontent/view.php?id=137234&section=8.1",
      "license": "CC BY-NC-SA 4.0",
      "ready": true,
      "start": 212.794989,
      "end": 213.509229,
      "sourceFile": "audio/speech/sources/audio-week4.mp3"
    },
    "МУ": {
      "file": "audio/speech/syllable-41c-423.mp3",
      "speaker": "OpenLearn course narrator",
      "source": "https://www.open.edu/openlearn/mod/oucontent/view.php?id=137234&section=8.1",
      "license": "CC BY-NC-SA 4.0",
      "ready": true,
      "start": 216.530726,
      "end": 217.211066,
      "sourceFile": "audio/speech/sources/audio-week4.mp3"
    },
    "МИ": {
      "file": "audio/speech/syllable-41c-418.mp3",
      "speaker": "OpenLearn course narrator",
      "source": "https://www.open.edu/openlearn/mod/oucontent/view.php?id=137234&section=8.1",
      "license": "CC BY-NC-SA 4.0",
      "ready": true,
      "start": 223.470726,
      "end": 224.192132,
      "sourceFile": "audio/speech/sources/audio-week4.mp3"
    },
    "МІ": {
      "file": "audio/speech/syllable-41c-406.mp3",
      "speaker": "OpenLearn course narrator",
      "source": "https://www.open.edu/openlearn/mod/oucontent/view.php?id=137234&section=8.1",
      "license": "CC BY-NC-SA 4.0",
      "ready": true,
      "start": 226.530726,
      "end": 227.247574,
      "sourceFile": "audio/speech/sources/audio-week4.mp3"
    },
    "НА": {
      "file": "audio/speech/syllable-41d-410.mp3",
      "speaker": "OpenLearn course narrator",
      "source": "https://www.open.edu/openlearn/mod/oucontent/view.php?id=137234&section=8.1",
      "license": "CC BY-NC-SA 4.0",
      "ready": true,
      "start": 230.030748,
      "end": 230.761723,
      "sourceFile": "audio/speech/sources/audio-week4.mp3"
    },
    "НО": {
      "file": "audio/speech/syllable-41d-41e.mp3",
      "speaker": "OpenLearn course narrator",
      "source": "https://www.open.edu/openlearn/mod/oucontent/view.php?id=137234&section=8.1",
      "license": "CC BY-NC-SA 4.0",
      "ready": true,
      "start": 233.195102,
      "end": 233.947732,
      "sourceFile": "audio/speech/sources/audio-week4.mp3"
    },
    "НУ": {
      "file": "audio/speech/syllable-41d-423.mp3",
      "speaker": "OpenLearn course narrator",
      "source": "https://www.open.edu/openlearn/mod/oucontent/view.php?id=137234&section=8.1",
      "license": "CC BY-NC-SA 4.0",
      "ready": true,
      "start": 236.513175,
      "end": 237.308639,
      "sourceFile": "audio/speech/sources/audio-week4.mp3"
    },
    "НИ": {
      "file": "audio/speech/syllable-41d-418.mp3",
      "speaker": "OpenLearn course narrator",
      "source": "https://www.open.edu/openlearn/mod/oucontent/view.php?id=137234&section=8.1",
      "license": "CC BY-NC-SA 4.0",
      "ready": true,
      "start": 242.974036,
      "end": 243.739229,
      "sourceFile": "audio/speech/sources/audio-week4.mp3"
    },
    "НІ": {
      "file": "audio/speech/syllable-41d-406.mp3",
      "speaker": "OpenLearn course narrator",
      "source": "https://www.open.edu/openlearn/mod/oucontent/view.php?id=137234&section=8.1",
      "license": "CC BY-NC-SA 4.0",
      "ready": true,
      "start": 245.830748,
      "end": 246.576372,
      "sourceFile": "audio/speech/sources/audio-week4.mp3"
    },
    "РА": {
      "file": "audio/speech/syllable-420-410.mp3",
      "speaker": "OpenLearn course narrator",
      "source": "https://www.open.edu/openlearn/mod/oucontent/view.php?id=137456&section=4",
      "license": "CC BY-NC-SA 4.0",
      "ready": true,
      "start": 24.233447,
      "end": 24.819184,
      "sourceFile": "audio/speech/sources/audio-week5.mp3"
    },
    "РО": {
      "file": "audio/speech/syllable-420-41e.mp3",
      "speaker": "OpenLearn course narrator",
      "source": "https://www.open.edu/openlearn/mod/oucontent/view.php?id=137456&section=4",
      "license": "CC BY-NC-SA 4.0",
      "ready": true,
      "start": 26.993265,
      "end": 27.694807,
      "sourceFile": "audio/speech/sources/audio-week5.mp3"
    },
    "РУ": {
      "file": "audio/speech/syllable-420-423.mp3",
      "speaker": "OpenLearn course narrator",
      "source": "https://www.open.edu/openlearn/mod/oucontent/view.php?id=137456&section=4",
      "license": "CC BY-NC-SA 4.0",
      "ready": true,
      "start": 29.739161,
      "end": 30.419819,
      "sourceFile": "audio/speech/sources/audio-week5.mp3"
    },
    "РИ": {
      "file": "audio/speech/syllable-420-418.mp3",
      "speaker": "OpenLearn course narrator",
      "source": "https://www.open.edu/openlearn/mod/oucontent/view.php?id=137456&section=4",
      "license": "CC BY-NC-SA 4.0",
      "ready": true,
      "start": 35.308662,
      "end": 35.953492,
      "sourceFile": "audio/speech/sources/audio-week5.mp3"
    },
    "РІ": {
      "file": "audio/speech/syllable-420-406.mp3",
      "speaker": "OpenLearn course narrator",
      "source": "https://www.open.edu/openlearn/mod/oucontent/view.php?id=137456&section=4",
      "license": "CC BY-NC-SA 4.0",
      "ready": true,
      "start": 38.173243,
      "end": 38.805782,
      "sourceFile": "audio/speech/sources/audio-week5.mp3"
    },
    "СА": {
      "file": "audio/speech/syllable-421-410.mp3",
      "speaker": "OpenLearn course narrator",
      "source": "https://www.open.edu/openlearn/mod/oucontent/view.php?id=137456&section=4",
      "license": "CC BY-NC-SA 4.0",
      "ready": true,
      "start": 41.428322,
      "end": 42.087143,
      "sourceFile": "audio/speech/sources/audio-week5.mp3"
    },
    "СО": {
      "file": "audio/speech/syllable-421-41e.mp3",
      "speaker": "OpenLearn course narrator",
      "source": "https://www.open.edu/openlearn/mod/oucontent/view.php?id=137456&section=4",
      "license": "CC BY-NC-SA 4.0",
      "ready": true,
      "start": 44.653311,
      "end": 45.20585,
      "sourceFile": "audio/speech/sources/audio-week5.mp3"
    },
    "СУ": {
      "file": "audio/speech/syllable-421-423.mp3",
      "speaker": "OpenLearn course narrator",
      "source": "https://www.open.edu/openlearn/mod/oucontent/view.php?id=137456&section=4",
      "license": "CC BY-NC-SA 4.0",
      "ready": true,
      "start": 47.622766,
      "end": 48.259456,
      "sourceFile": "audio/speech/sources/audio-week5.mp3"
    },
    "СИ": {
      "file": "audio/speech/syllable-421-418.mp3",
      "speaker": "OpenLearn course narrator",
      "source": "https://www.open.edu/openlearn/mod/oucontent/view.php?id=137456&section=4",
      "license": "CC BY-NC-SA 4.0",
      "ready": true,
      "start": 53.613265,
      "end": 54.407982,
      "sourceFile": "audio/speech/sources/audio-week5.mp3"
    },
    "СІ": {
      "file": "audio/speech/syllable-421-406.mp3",
      "speaker": "OpenLearn course narrator",
      "source": "https://www.open.edu/openlearn/mod/oucontent/view.php?id=137456&section=4",
      "license": "CC BY-NC-SA 4.0",
      "ready": true,
      "start": 56.627438,
      "end": 57.404603,
      "sourceFile": "audio/speech/sources/audio-week5.mp3"
    },
    "ТА": {
      "file": "audio/speech/syllable-422-410.mp3",
      "speaker": "OpenLearn course narrator",
      "source": "https://www.open.edu/openlearn/mod/oucontent/view.php?id=137456&section=4",
      "license": "CC BY-NC-SA 4.0",
      "ready": true,
      "start": 60.74263,
      "end": 61.280567,
      "sourceFile": "audio/speech/sources/audio-week5.mp3"
    },
    "ТО": {
      "file": "audio/speech/syllable-422-41e.mp3",
      "speaker": "OpenLearn course narrator",
      "source": "https://www.open.edu/openlearn/mod/oucontent/view.php?id=137456&section=4",
      "license": "CC BY-NC-SA 4.0",
      "ready": true,
      "start": 63.833492,
      "end": 64.378367,
      "sourceFile": "audio/speech/sources/audio-week5.mp3"
    },
    "ТУ": {
      "file": "audio/speech/syllable-422-423.mp3",
      "speaker": "OpenLearn course narrator",
      "source": "https://www.open.edu/openlearn/mod/oucontent/view.php?id=137456&section=4",
      "license": "CC BY-NC-SA 4.0",
      "ready": true,
      "start": 67.393583,
      "end": 67.974921,
      "sourceFile": "audio/speech/sources/audio-week5.mp3"
    },
    "ТИ": {
      "file": "audio/speech/syllable-422-418.mp3",
      "speaker": "OpenLearn course narrator",
      "source": "https://www.open.edu/openlearn/mod/oucontent/view.php?id=137456&section=4",
      "license": "CC BY-NC-SA 4.0",
      "ready": true,
      "start": 73.968685,
      "end": 74.513469,
      "sourceFile": "audio/speech/sources/audio-week5.mp3"
    },
    "ТІ": {
      "file": "audio/speech/syllable-422-406.mp3",
      "speaker": "OpenLearn course narrator",
      "source": "https://www.open.edu/openlearn/mod/oucontent/view.php?id=137456&section=4",
      "license": "CC BY-NC-SA 4.0",
      "ready": true,
      "start": 77.085351,
      "end": 77.714671,
      "sourceFile": "audio/speech/sources/audio-week5.mp3"
    }
  },
  "words": {
    "МАМА": {
      "file": "audio/speech/ukr-265a50e4.mp3",
      "speaker": "Галя Раптова",
      "gender": "female",
      "source": "https://www.yojik.eu/audiocollections/detailled/ukr-balm-galja/mp3/ukr-265a50e4.mp3",
      "license": "CC BY 2.0 France",
      "ready": true
    },
    "ТАТО": {
      "file": "audio/speech/ukr-635d0c8d.mp3",
      "speaker": "Галя Раптова",
      "gender": "female",
      "source": "https://www.yojik.eu/audiocollections/detailled/ukr-balm-galja/mp3/ukr-635d0c8d.mp3",
      "license": "CC BY 2.0 France",
      "ready": true
    },
    "РАМА": {
      "file": "audio/speech/ukr-85339f5c.mp3",
      "speaker": "Галя Раптова",
      "gender": "female",
      "source": "https://www.yojik.eu/audiocollections/detailled/ukr-balm-galja/mp3/ukr-85339f5c.mp3",
      "license": "CC BY 2.0 France",
      "ready": true
    },
    "НОРА": {
      "file": "audio/speech/ukr-aad09ea0.mp3",
      "speaker": "Галя Раптова",
      "gender": "female",
      "source": "https://www.yojik.eu/audiocollections/detailled/ukr-balm-galja/mp3/ukr-aad09ea0.mp3",
      "license": "CC BY 2.0 France",
      "ready": true
    },
    "РАНА": {
      "file": "audio/speech/ukr-84f1f56b.mp3",
      "speaker": "Галя Раптова",
      "gender": "female",
      "source": "https://www.yojik.eu/audiocollections/detailled/ukr-balm-galja/mp3/ukr-84f1f56b.mp3",
      "license": "CC BY 2.0 France",
      "ready": true
    },
    "ЛІТО": {
      "file": "audio/speech/ukr-17d1e593.mp3",
      "speaker": "Галя Раптова",
      "gender": "female",
      "source": "https://www.yojik.eu/audiocollections/detailled/ukr-balm-galja/mp3/ukr-17d1e593.mp3",
      "license": "CC BY 2.0 France",
      "ready": true
    },
    "САЛО": {
      "file": "audio/speech/ukr-c1b3af6a.mp3",
      "speaker": "Галя Раптова",
      "gender": "female",
      "source": "https://www.yojik.eu/audiocollections/detailled/ukr-balm-galja/mp3/ukr-c1b3af6a.mp3",
      "license": "CC BY 2.0 France",
      "ready": true
    },
    "МИЛО": {
      "file": "audio/speech/ukr-f4dd20a7.mp3",
      "speaker": "Галя Раптова",
      "gender": "female",
      "source": "https://www.yojik.eu/audiocollections/detailled/ukr-balm-galja/mp3/ukr-f4dd20a7.mp3",
      "license": "CC BY 2.0 France",
      "ready": true
    },
    "СИЛА": {
      "file": "audio/speech/ukr-167bc9ac.mp3",
      "speaker": "Галя Раптова",
      "gender": "female",
      "source": "https://www.yojik.eu/audiocollections/detailled/ukr-balm-galja/mp3/ukr-167bc9ac.mp3",
      "license": "CC BY 2.0 France",
      "ready": true
    }
  },
  "letters": {},
  "credits": "audio/speech/CREDITS.txt",
  "missing": [],
  "notes": "Existing human recordings. Syllables are contiguous excerpts, never joined letter names. Word recordings have confirmed female speaker metadata."
};
if(typeof module!=="undefined"&&module.exports)module.exports=library;else root.SpeechLibrary=library;
})(typeof window!=="undefined"?window:globalThis);
