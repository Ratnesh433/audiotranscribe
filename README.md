# Audio Transcription App

## Overview
This is a web-based application that allows users to upload audio files for transcription using the AssemblyAI API. The app supports multiple audio formats and provides real-time progress updates, along with metadata such as language detection, confidence score, and duration of the transcription.

## Features
- Drag and drop audio upload
- Supports common audio formats (MP3, WAV, OGG, etc.)
- Real-time progress bar for transcription
- Displays transcription text along with metadata
- Copy transcription to clipboard
- Download transcription as a text file
- Automatic cleanup of uploaded audio files
- Error handling for invalid file types and sizes

## Tech Stack
- Backend: Node.js, Express, Multer, AssemblyAI API
- Frontend: JavaScript, HTML, CSS (Bootstrap)
- File handling: Multer (for file uploads), FS module (for file management)

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- NPM or Yarn

### Clone the Repository
```sh
git clone https://github.com/yourusername/audio-transcription-app.git
cd audio-transcription-app
```

### Install Dependencies
```sh
npm install
```

### Set Up API Key
Replace `ASSEMBLYAI_API_KEY` in `server.js` with your own AssemblyAI API key.

### Start the Server
```sh
npm start
```
The server will run on `http://localhost:3000`.

## API Endpoints

### Upload and Transcribe Audio
**POST** `/transcribe`
- Accepts an audio file (`multipart/form-data`)
- Returns a JSON response with transcription text, language, confidence, and duration

### Cleanup Audio File
**DELETE** `/cleanup/:filename`
- Deletes the uploaded audio file after transcription

## Usage
1. Open `http://localhost:3000` in a browser.
2. Drag and drop or select an audio file to upload.
3. Wait for the transcription to complete.
4. View, copy, or download the transcription.

## Error Handling
- Invalid file types and oversized files are rejected.
- If transcription fails, a meaningful error message is displayed.

## Future Enhancements
- Add user authentication
- Support multiple transcription engines
- Store transcriptions in a database
- Provide translation of transcriptions

## License
This project is open-source and available under the MIT License.

---
Made with ❤️ using Node.js & JavaScript

