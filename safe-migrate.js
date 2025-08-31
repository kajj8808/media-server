import { runGradualMigration, getMigrationStats } from './src/services/migration.js';
import fs from 'fs';
import path from 'path';

async function safeMigration() {
  console.log('=== 🛡️  SAFE Migration for 800+ Video Files ===\n');
  
  // Check current status
  console.log('📊 Current migration status:');
  const stats = await getMigrationStats();
  console.log(`  Total files: ${stats.total}`);
  console.log(`  Already migrated: ${stats.migrated}`);
  console.log(`  Remaining: ${stats.total - stats.migrated}\n`);
  
  if (stats.total === 0) {
    console.log('✅ No files found in public/video directory');
    return;
  }
  
  if (stats.migrated === stats.total) {
    console.log('✅ All files already migrated!');
    return;
  }
  
  // Check available space
  console.log('💾 Storage space check:');
  const drives = ['/mnt/c', '/mnt/d'];
  let totalFreeSpace = 0;
  
  for (const drive of drives) {
    try {
      const mediaPath = `${drive}/media/videos`;
      if (!fs.existsSync(mediaPath)) {
        await fs.promises.mkdir(mediaPath, { recursive: true });
        console.log(`  Created: ${mediaPath}`);
      }
      
      const stats = await fs.promises.statfs(drive);
      const freeGB = (stats.bfree * stats.bsize) / (1024 * 1024 * 1024);
      totalFreeSpace += freeGB;
      console.log(`  ${drive}: ${freeGB.toFixed(2)} GB free`);
    } catch (error) {
      console.log(`  ${drive}: Not available`);
    }
  }
  
  // Estimate required space
  const legacyVideoPath = path.join(process.cwd(), 'public', 'video');
  let totalSizeGB = 0;
  
  if (fs.existsSync(legacyVideoPath)) {
    const files = await fs.promises.readdir(legacyVideoPath);
    for (const file of files.slice(0, 10)) { // Sample first 10 files
      const filePath = path.join(legacyVideoPath, file);
      const stats = await fs.promises.stat(filePath);
      totalSizeGB += stats.size;
    }
    totalSizeGB = (totalSizeGB / 10 * files.length) / (1024 * 1024 * 1024); // Estimate total
  }
  
  console.log(`  Estimated total size: ${totalSizeGB.toFixed(2)} GB`);
  console.log(`  Available space: ${totalFreeSpace.toFixed(2)} GB`);
  
  if (totalSizeGB > totalFreeSpace * 0.8) {
    console.log('  ⚠️  Warning: Limited disk space, consider cleaning up first');
  } else {
    console.log('  ✅ Sufficient space available');
  }
  
  console.log('\n🔄 Starting SAFE migration...');
  console.log('Strategy: Copy files WITHOUT deleting originals');
  console.log('This ensures zero data loss during migration\n');
  
  // Run migration without deleting originals
  await runGradualMigration(5, false); // Small batches, no deletion
  
  console.log('\n🎯 Next steps:');
  console.log('1. ✅ Test streaming with new storage system');
  console.log('2. ✅ Verify all videos work correctly');
  console.log('3. 🔍 After thorough testing, run cleanup script');
  console.log('\n💡 All original files are preserved in public/video/');
  console.log('   The new storage system will use WSL drives first, fallback to public/video');
  
  // Final status
  const finalStats = await getMigrationStats();
  console.log('\n📈 Migration Results:');
  console.log(`  Copied: ${finalStats.migrated} files`);
  console.log(`  Success rate: ${((finalStats.migrated / finalStats.total) * 100).toFixed(1)}%`);
}

// Cleanup script for after verification
async function cleanupOriginals() {
  console.log('=== 🧹 Cleanup Original Files ===\n');
  console.log('⚠️  WARNING: This will DELETE original files from public/video/');
  console.log('Only run this after verifying all videos work correctly!\n');
  
  // This would run the migration with deleteOriginal=true
  // await runGradualMigration(5, true);
  console.log('Uncomment the above line when ready to delete originals');
}

// Run based on command line argument
const mode = process.argv[2];

if (mode === 'cleanup') {
  cleanupOriginals().catch(console.error);
} else {
  safeMigration().catch(console.error);
}