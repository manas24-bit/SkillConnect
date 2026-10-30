// cloudinary-config.js - DEBUG VERSION
const cloudinaryConfig = {
    cloudName: 'dgnqjvl8r',
    apiKey: '658364871663514'
};

async function uploadToCloudinary(file, folder = 'skillconnect') {
    return new Promise((resolve, reject) => {
        // Try different presets in order
        const presetsToTry = [
            'skillconnect_profile_photos',
            'ml_default',
            null  // No preset
        ];
        
        attemptUploadWithPreset(file, folder, presetsToTry, 0, resolve, reject);
    });
}

function attemptUploadWithPreset(file, folder, presets, index, resolve, reject) {
    if (index >= presets.length) {
        reject(new Error('All upload attempts failed'));
        return;
    }
    
    const preset = presets[index];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    formData.append('cloud_name', cloudinaryConfig.cloudName);
    
    if (preset) {
        formData.append('upload_preset', preset);
    }

    console.log(`Attempt ${index + 1}: Uploading with preset: ${preset || 'none'}`);

    fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/upload`, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            console.log(`Preset ${preset} failed:`, data.error.message);
            // Try next preset
            attemptUploadWithPreset(file, folder, presets, index + 1, resolve, reject);
        } else {
            console.log(`Upload successful with preset: ${preset}`);
            resolve(data);
        }
    })
    .catch(error => {
        console.log(`Preset ${preset} network error:`, error);
        attemptUploadWithPreset(file, folder, presets, index + 1, resolve, reject);
    });
}

async function uploadMultipleToCloudinary(files, folder = 'skillconnect') {
    return Promise.all(files.map(file => uploadToCloudinary(file, folder)));
}

export { cloudinaryConfig, uploadToCloudinary, uploadMultipleToCloudinary };