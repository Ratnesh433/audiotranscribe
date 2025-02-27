import express from 'express';
import multer from 'multer';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

const app = express();
const UPLOAD_DIR = 'uploads';

// Configure multer with file filtering and storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR);
    }
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Keep original filename but make it unique
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Accept common audio formats
  const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/ogg', 'audio/webm'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only audio files are allowed.'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB limit
  }
});

const ASSEMBLYAI_API_KEY = 'eacbefa71a194902a6f226f53ab85e62';

// Serve static files from the public directory
app.use(express.static('public'));
// Serve files from uploads directory (for audio playback)
app.use('/uploads', express.static('uploads'));

// Route for transcribing audio
app.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided.' });
    }

    const audioPath = req.file.path;
    const audioUrl = `/uploads/${path.basename(audioPath)}`; // URL for client playback

    // Step 1: Upload the audio to AssemblyAI
    const uploadResponse = await axios.post(
      'https://api.assemblyai.com/v2/upload',
      fs.createReadStream(audioPath),
      {
        headers: {
          authorization: ASSEMBLYAI_API_KEY,
          'content-type': 'application/octet-stream',
        },
      }
    );

    const assemblyAudioUrl = uploadResponse.data.upload_url;

    // Step 2: Request transcription
    const transcriptionResponse = await axios.post(
      'https://api.assemblyai.com/v2/transcript',
      {
        audio_url: assemblyAudioUrl,
        language_detection: true // Automatically detect language
      },
      {
        headers: {
          authorization: ASSEMBLYAI_API_KEY,
          'content-type': 'application/json',
        },
      }
    );

    const transcriptId = transcriptionResponse.data.id;

    // Step 3: Poll for the transcription result
    let transcription;
    let retries = 0;
    const maxRetries = 60; // 5 minutes maximum waiting time

    while (!transcription || transcription.status !== 'completed') {
      if (retries >= maxRetries) {
        throw new Error('Transcription timeout');
      }

      const result = await axios.get(
        `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
        {
          headers: {
            authorization: ASSEMBLYAI_API_KEY,
          },
        }
      );
      
      transcription = result.data;

      if (transcription.status === 'error') {
        throw new Error(`Transcription failed: ${transcription.error}`);
      }

      if (transcription.status !== 'completed') {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        retries++;
      }
    }

    // Send transcription and audio URL back to frontend
    res.json({ 
      transcription: transcription.text,
      audioUrl: audioUrl,
      language: transcription.language_code,
      confidence: transcription.confidence,
      duration: transcription.audio_duration
    });

  } catch (error) {
    console.error('Transcription error:', error);
    
    // Clean up the uploaded file in case of error
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }

    // Send appropriate error message to client
    res.status(500).json({ 
      error: error.message || 'Failed to transcribe audio.'
    });
  }
});

// Cleanup route - delete audio file after transcription is complete
app.delete('/cleanup/:filename', (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(UPLOAD_DIR, filename);

  // Verify the file exists and is in the uploads directory
  if (fs.existsSync(filepath) && filepath.startsWith(path.resolve(UPLOAD_DIR))) {
    fs.unlink(filepath, (err) => {
      if (err) {
        console.error('Error deleting file:', err);
        return res.status(500).json({ error: 'Failed to delete file' });
      }
      res.json({ message: 'File deleted successfully' });
    });
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size too large. Maximum size is 25MB.' });
    }
    return res.status(400).json({ error: error.message });
  }
  next(error);
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  
  // Create uploads directory if it doesn't exist
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR);
  }
});