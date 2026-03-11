const fs = require('fs');

async function testUpload() {
  const fileContent = Buffer.from('dummy image content');
  const blob = new Blob([fileContent], { type: 'image/jpeg' });
  const formData = new FormData();
  formData.append('file', blob, 'test.jpg');

  try {
    const res = await fetch('http://localhost:3000/api/tickets/upload', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Response:', data);
  } catch (err) {
    console.error('Error:', err);
  }
}

testUpload();
