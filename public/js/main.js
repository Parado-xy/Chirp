document.addEventListener('DOMContentLoaded', function() {
  // Show API Key Modal on successful registration
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('registered') === 'true') {
    const apiKeyModal = new bootstrap.Modal(document.getElementById('apiKeyModal'));
    apiKeyModal.show();
  }
  
  // Copy to clipboard functionality
  document.querySelectorAll('.copy-btn').forEach(button => {
    button.addEventListener('click', function() {
      const targetId = this.getAttribute('data-clipboard-target');
      let textToCopy;
      
      if (targetId) {
        textToCopy = document.querySelector(targetId).textContent;
      } else {
        // If no target specified, find the closest code element
        const codeBlock = this.closest('.code-block, .api-key-container');
        if (codeBlock) {
          textToCopy = codeBlock.querySelector('code, pre').textContent;
        }
      }
      
      if (textToCopy) {
        navigator.clipboard.writeText(textToCopy).then(() => {
          // Change button text temporarily
          const originalText = this.innerHTML;
          this.innerHTML = '<i class="bx bx-check"></i> Copied!';
          
          setTimeout(() => {
            this.innerHTML = originalText;
          }, 2000);
        }).catch(err => {
          console.error('Failed to copy: ', err);
        });
      }
    });
  });
  
  // Password visibility toggle
  document.querySelectorAll('.toggle-password').forEach(button => {
    button.addEventListener('click', function() {
      const input = this.parentNode.querySelector('input');
      const icon = this.querySelector('i');
      
      if (input.type === 'password') {
        input.type = 'text';
        icon.classList.replace('bx-show', 'bx-hide');
      } else {
        input.type = 'password';
        icon.classList.replace('bx-hide', 'bx-show');
      }
    });
  });
});