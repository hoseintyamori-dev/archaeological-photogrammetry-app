document.addEventListener('DOMContentLoaded', () => {
  const button = document.getElementById('startButton');

  if (button) {
    button.addEventListener('click', () => {
      button.textContent = 'Project setup ready';
    });
  }
});
