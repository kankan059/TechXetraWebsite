import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';

cloudinary.config({
  cloud_name: 'zbayvhfd',
  api_key: '176786915756837', 
  api_secret: 'Xk5DqIVsjZAliKdwswG_Yv1RMFI', 
});

async function fetchFromCloudinary() {
  try {
    console.log(' Fetching images from Cloudinary root...');
    
    // No prefix means it fetches from the root directory
    const result = await cloudinary.api.resources({
      type: 'upload',
      max_results: 500 
    });
    
    // Filter out the default Cloudinary 'samples' folder
    const userImages = result.resources.filter((r: any) => !r.public_id.startsWith('samples/'));
    
    const manifest = userImages.map((resource: any) => ({
      publicId: resource.public_id, // This will just be "DSC07956", etc.
      alt: `TechXetra gallery photo: ${resource.public_id.replace(/[-_]+/g, ' ')}`
    }));

    const outputPath = path.join(process.cwd(), 'data', 'gallery-manifest.json');
    fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));
    
    console.log(`✅ Successfully generated manifest with ${manifest.length} images!`);
    
  } catch (error) {
    console.error("❌ Failed to fetch from Cloudinary.", error);
  }
}

fetchFromCloudinary();