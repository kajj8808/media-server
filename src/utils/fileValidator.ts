import fs from "fs";
import path from "path";
import db from "@services/database";

interface FileIssue {
  type: 'UNLINKED_FILE' | 'UNLINKED_MAGNET' | 'MISSING_FILE' | 'MISSING_CONTENT';
  filePath?: string;
  videoId?: string;
  magnetId?: number;
  details: string;
}

/**
 * DB에 없는 잘못된 파일들을 찾는 함수
 */
export async function findProblematicFiles(): Promise<FileIssue[]> {
  const issues: FileIssue[] = [];
  
  console.log("파일 시스템과 DB 일치성 검사 시작...");

  try {
    // 1. 파일 시스템의 비디오 파일들 가져오기
    const videoDir = "./public/video";
    const tempDir = "./public/temp";
    
    let videoFiles: string[] = [];
    let tempFiles: string[] = [];

    if (fs.existsSync(videoDir)) {
      videoFiles = fs.readdirSync(videoDir).filter(file => 
        file.endsWith('.mp4') || file.endsWith('.mkv') || 
        file.endsWith('.avi') || file.endsWith('.webm')
      );
    }

    if (fs.existsSync(tempDir)) {
      tempFiles = fs.readdirSync(tempDir).filter(file => 
        file.endsWith('.mp4') || file.endsWith('.mkv') || 
        file.endsWith('.avi') || file.endsWith('.webm')
      );
    }

    console.log(`비디오 파일 수: ${videoFiles.length}, 임시 파일 수: ${tempFiles.length}`);

    // 2. DB에서 모든 VideoContent 가져오기
    const videoContents = await db.videoContent.findMany({
      select: {
        id: true,
        watch_id: true,
        type: true,
        magnet_id: true,
        episode: {
          select: { name: true }
        },
        movie: {
          select: { title: true }
        }
      }
    });

    console.log(`DB VideoContent 수: ${videoContents.length}`);

    // 3. DB에 있는 watch_id들 추출
    const dbWatchIds = new Set(videoContents.map(vc => vc.watch_id));

    // 4. 파일 시스템에만 있는 고아 파일들 찾기
    for (const file of videoFiles) {
      const fileName = path.parse(file).name; // 확장자 제거
      
      if (!dbWatchIds.has(fileName)) {
        issues.push({
          type: 'UNLINKED_FILE',
          filePath: path.join(videoDir, file),
          details: `DB에 해당하는 VideoContent가 없는 비디오 파일: ${file}`
        });
      }
    }

    // 5. DB에만 있는 누락 파일들 찾기
    for (const content of videoContents) {
      const expectedFile = `${content.watch_id}.mp4`;
      const filePath = path.join(videoDir, expectedFile);
      
      if (!fs.existsSync(filePath)) {
        issues.push({
          type: 'MISSING_FILE',
          videoId: content.watch_id,
          details: `VideoContent는 있지만 실제 파일이 없음: ${expectedFile}`
        });
      }
    }

    // 6. Magnet은 있지만 VideoContent가 없는 항목들 찾기
    const magnets = await db.magnet.findMany({
      include: {
        video_contents: true
      }
    });

    for (const magnet of magnets) {
      if (magnet.video_contents.length === 0) {
        issues.push({
          type: 'UNLINKED_MAGNET',
          magnetId: magnet.id,
          details: `VideoContent가 생성되지 않은 Magnet: ${magnet.chiper_link.substring(0, 50)}...`
        });
      }
    }

    // 7. VideoContent는 있지만 Episode/Movie가 없는 항목들 찾기
    const contentsWithoutEpisodeOrMovie = videoContents.filter(vc => 
      !vc.episode && !vc.movie
    );

    for (const content of contentsWithoutEpisodeOrMovie) {
      issues.push({
        type: 'MISSING_CONTENT',
        videoId: content.watch_id,
        details: `VideoContent는 있지만 Episode/Movie 정보가 없음: ${content.watch_id}`
      });
    }

    console.log(`총 ${issues.length}개의 문제 발견`);
    
    return issues;

  } catch (error) {
    console.error("파일 검증 중 오류:", error);
    throw error;
  }
}

/**
 * 문제 유형별로 그룹화해서 출력
 */
export function printFileIssues(issues: FileIssue[]): void {
  const grouped = issues.reduce((acc, issue) => {
    if (!acc[issue.type]) acc[issue.type] = [];
    acc[issue.type].push(issue);
    return acc;
  }, {} as Record<string, FileIssue[]>);

  console.log("\n=== 파일 시스템 문제 리포트 ===");
  
  Object.entries(grouped).forEach(([type, typeIssues]) => {
    console.log(`\n${type}: ${typeIssues.length}개`);
    typeIssues.forEach((issue, index) => {
      console.log(`  ${index + 1}. ${issue.details}`);
      if (issue.filePath) console.log(`     파일: ${issue.filePath}`);
      if (issue.videoId) console.log(`     Video ID: ${issue.videoId}`);
      if (issue.magnetId) console.log(`     Magnet ID: ${issue.magnetId}`);
    });
  });
  
  console.log(`\n총 문제: ${issues.length}개\n`);
}
