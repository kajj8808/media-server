import fs from "fs";
import path from "path";
import { getBestStoragePath } from "./storage";

interface MigrationStats {
  total: number;
  migrated: number;
  failed: number;
  skipped: number;
}

export async function migrateVideoFileGradually(
  videoId: string,
  deleteOriginal: boolean = false
): Promise<boolean> {
  const legacyPath = path.join(process.cwd(), "public", "video", videoId);
  
  // Check if file exists in legacy location
  if (!fs.existsSync(legacyPath)) {
    return false; // File not found in legacy location
  }
  
  try {
    // Get best storage location
    const storagePath = await getBestStoragePath();
    const targetPath = path.join(storagePath, videoId);
    
    // Skip if already exists in new location
    if (fs.existsSync(targetPath)) {
      console.log(`File already migrated: ${videoId}`);
      return true;
    }
    
    // Copy file to new location
    await fs.promises.copyFile(legacyPath, targetPath);
    console.log(`Migrated: ${videoId} -> ${targetPath}`);
    
    // Verify copy was successful
    const originalStats = await fs.promises.stat(legacyPath);
    const copiedStats = await fs.promises.stat(targetPath);
    
    if (originalStats.size === copiedStats.size) {
      // Only delete original if explicitly requested and copy verified
      if (deleteOriginal) {
        await fs.promises.unlink(legacyPath);
        console.log(`Deleted original: ${legacyPath}`);
      }
      return true;
    } else {
      // Size mismatch - delete corrupted copy
      await fs.promises.unlink(targetPath);
      throw new Error(`Size mismatch during migration of ${videoId}`);
    }
  } catch (error) {
    console.error(`Failed to migrate ${videoId}:`, error);
    return false;
  }
}

export async function getMigrationStats(): Promise<MigrationStats> {
  const stats: MigrationStats = {
    total: 0,
    migrated: 0,
    failed: 0,
    skipped: 0
  };
  
  const legacyVideoPath = path.join(process.cwd(), "public", "video");
  
  if (!fs.existsSync(legacyVideoPath)) {
    return stats;
  }
  
  const files = await fs.promises.readdir(legacyVideoPath);
  stats.total = files.length;
  
  // Check each file's migration status
  for (const file of files) {
    const legacyPath = path.join(legacyVideoPath, file);
    
    // Find corresponding file in new storage
    const { STORAGE_CONFIG } = await import("../config/storage");
    let foundInNewStorage = false;
    
    for (const drive of STORAGE_CONFIG.drives) {
      const newPath = path.join(drive.path, file);
      if (fs.existsSync(newPath)) {
        foundInNewStorage = true;
        break;
      }
    }
    
    if (foundInNewStorage) {
      stats.migrated++;
    }
  }
  
  return stats;
}

export async function runGradualMigration(
  batchSize: number = 10,
  deleteOriginal: boolean = false
): Promise<void> {
  console.log('=== Gradual Migration Started ===');
  console.log(`Batch size: ${batchSize}, Delete original: ${deleteOriginal}\n`);
  
  const legacyVideoPath = path.join(process.cwd(), "public", "video");
  
  if (!fs.existsSync(legacyVideoPath)) {
    console.log('No legacy public/video directory found');
    return;
  }
  
  const files = await fs.promises.readdir(legacyVideoPath);
  console.log(`Found ${files.length} files in legacy storage\n`);
  
  let processed = 0;
  let successful = 0;
  let failed = 0;
  
  // Process files in batches
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1}: files ${i + 1}-${Math.min(i + batchSize, files.length)}`);
    
    for (const file of batch) {
      const success = await migrateVideoFileGradually(file, deleteOriginal);
      processed++;
      
      if (success) {
        successful++;
        console.log(`  ✅ ${file} (${processed}/${files.length})`);
      } else {
        failed++;
        console.log(`  ❌ ${file} (${processed}/${files.length})`);
      }
    }
    
    // Brief pause between batches to avoid overwhelming the system
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`Batch complete. Progress: ${processed}/${files.length}\n`);
  }
  
  console.log('=== Migration Summary ===');
  console.log(`Total files: ${files.length}`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);
  console.log(`Success rate: ${((successful / files.length) * 100).toFixed(1)}%`);
  
  if (!deleteOriginal) {
    console.log('\n💡 Files copied but originals preserved');
    console.log('   Run with deleteOriginal=true after verifying copies');
  }
}