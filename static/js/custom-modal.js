
// Custom modal dialog function to replace prompt()
function openCustomModal(message, defaultValue = '', callback) {
  // Create modal container if it doesn't exist
  let modalContainer = document.getElementById('custom-prompt-modal');
  if (!modalContainer) {
    modalContainer = document.createElement('div');
    modalContainer.id = 'custom-prompt-modal';
    modalContainer.className = 'modal-overlay';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    
    const modalTitle = document.createElement('h3');
    modalTitle.id = 'modal-prompt-message';
    
    const modalInput = document.createElement('input');
    modalInput.id = 'modal-prompt-input';
    modalInput.type = 'text';
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'flex-end';
    buttonContainer.style.marginTop = '15px';
    
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.onclick = () => {
      modalContainer.style.display = 'none';
      if (callback) callback(null);
    };
    
    const okButton = document.createElement('button');
    okButton.textContent = 'OK';
    okButton.style.marginLeft = '10px';
    okButton.onclick = () => {
      const value = document.getElementById('modal-prompt-input').value;
      modalContainer.style.display = 'none';
      if (callback) callback(value);
    };
    
    buttonContainer.appendChild(cancelButton);
    buttonContainer.appendChild(okButton);
    
    modalContent.appendChild(modalTitle);
    modalContent.appendChild(modalInput);
    modalContent.appendChild(buttonContainer);
    modalContainer.appendChild(modalContent);
    
    document.body.appendChild(modalContainer);
  }
  
  // Set modal content
  document.getElementById('modal-prompt-message').textContent = message;
  document.getElementById('modal-prompt-input').value = defaultValue;
  
  // Show modal
  modalContainer.style.display = 'flex';
  document.getElementById('modal-prompt-input').focus();
}
