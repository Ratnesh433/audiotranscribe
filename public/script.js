document.addEventListener('DOMContentLoaded', function() {
  const uploadArea = document.getElementById('upload-area');
  const audioInput = document.getElementById('audio-file');
  const progressArea = document.getElementById('progress-area');
  const progressBar = progressArea.querySelector('.progress-bar');
  const resultArea = document.getElementById('result');
  const transcriptionElement = document.getElementById('transcription');
  const copyBtn = document.getElementById('copy-btn');
  const downloadBtn = document.getElementById('download-btn');
  const audioPlayerContainer = document.getElementById('audio-player-container');
  const audioPlayer = document.getElementById('audio-player');

  // Drag and drop functionality
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      uploadArea.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
      e.preventDefault();
      e.stopPropagation();
  }

  ['dragenter', 'dragover'].forEach(eventName => {
      uploadArea.addEventListener(eventName, highlight, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
      uploadArea.addEventListener(eventName, unhighlight, false);
  });

  function highlight(e) {
      uploadArea.classList.add('border-primary', 'bg-light');
  }

  function unhighlight(e) {
      uploadArea.classList.remove('border-primary', 'bg-light');
  }

  uploadArea.addEventListener('drop', handleDrop, false);

  function handleDrop(e) {
      const dt = e.dataTransfer;
      const files = dt.files;
      handleFiles(files);
  }

  audioInput.addEventListener('change', function(e) {
      handleFiles(this.files);
  });

  async function handleFiles(files) {
      if (!files.length) return;

      const file = files[0];
      if (!file.type.startsWith('audio/')) {
          showToast('Please upload an audio file.', 'error');
          return;
      }

      if (file.size > 25 * 1024 * 1024) {
          showToast('File size exceeds 25MB limit.', 'error');
          return;
      }

      const formData = new FormData();
      formData.append('audio', file);

      try {
          showProgress();
          
          const response = await fetch('/transcribe', {
              method: 'POST',
              body: formData
          });

          if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to transcribe the audio.');
          }

          const data = await response.json();
          showResult(data);
          
          // Update audio player
          if (data.audioUrl) {
              audioPlayer.src = data.audioUrl;
              audioPlayerContainer.classList.remove('d-none');
          }

          // Clean up the audio file after transcription
          if (data.audioUrl) {
              const filename = data.audioUrl.split('/').pop();
              await fetch(`/cleanup/${filename}`, { method: 'DELETE' });
          }

      } catch (error) {
          showError(error.message);
      } finally {
          hideProgress();
      }
  }

  function showProgress() {
      progressArea.classList.remove('d-none');
      resultArea.classList.add('d-none');
      let progress = 0;
      const interval = setInterval(() => {
          progress += 2;
          if (progress >= 90) clearInterval(interval);
          progressBar.style.width = `${progress}%`;
          progressBar.setAttribute('aria-valuenow', progress);
      }, 1000);
  }

  function hideProgress() {
      progressArea.classList.add('d-none');
      progressBar.style.width = '0%';
      progressBar.setAttribute('aria-valuenow', 0);
  }

  function showResult(data) {
      // Update transcription text
      transcriptionElement.textContent = data.transcription;
      
      // Update metadata badges
      if (data.language) {
          document.getElementById('language-text').textContent = `Language: ${data.language.toUpperCase()}`;
      }
      
      if (data.duration) {
          const minutes = Math.floor(data.duration / 60);
          const seconds = Math.round(data.duration % 60);
          document.getElementById('duration-text').textContent = `Duration: ${minutes}:${seconds.toString().padStart(2, '0')}`;
      }
      
      if (data.confidence) {
          const confidence = Math.round(data.confidence * 100);
          document.getElementById('confidence-text').textContent = `Confidence: ${confidence}%`;
      }

      resultArea.classList.remove('d-none');
      resultArea.classList.add('animate__animated', 'animate__fadeIn');
      transcriptionElement.classList.remove('text-danger');
  }

  function showError(message) {
      transcriptionElement.textContent = `Error: ${message}`;
      resultArea.classList.remove('d-none');
      transcriptionElement.classList.add('text-danger');
  }

  // Copy functionality
  copyBtn.addEventListener('click', async () => {
      try {
          await navigator.clipboard.writeText(transcriptionElement.textContent);
          showToast('Copied to clipboard!', 'success');
      } catch (err) {
          showToast('Failed to copy text.', 'error');
      }
  });

  // Download functionality
  downloadBtn.addEventListener('click', () => {
      const text = transcriptionElement.textContent;
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'transcription.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  });

  // Toast notification function
  function showToast(message, type = 'info') {
      const toast = document.createElement('div');
      toast.className = `toast align-items-center text-white bg-${type === 'error' ? 'danger' : 'success'} position-fixed bottom-0 end-0 m-3`;
      toast.setAttribute('role', 'alert');
      toast.innerHTML = `
          <div class="d-flex">
              <div class="toast-body">${message}</div>
              <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
          </div>
      `;
      document.body.appendChild(toast);
      const bsToast = new bootstrap.Toast(toast);
      bsToast.show();
      toast.addEventListener('hidden.bs.toast', () => {
          document.body.removeChild(toast);
      });
  }
}); 