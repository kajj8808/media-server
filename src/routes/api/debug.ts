import { Router } from "express";
import { findProblematicFiles, printFileIssues } from "@utils/fileValidator";

const debugRouter = Router();

// 파일 문제 확인
debugRouter.get("/files", async (req, res) => {
  try {
    console.log("파일 시스템 검사 시작...");
    const issues = await findProblematicFiles();
    
    // 콘솔에도 출력
    printFileIssues(issues);
    
    res.json({
      success: true,
      totalIssues: issues.length,
      summary: {
        unlinkedFiles: issues.filter(i => i.type === 'UNLINKED_FILE').length,
        unlinkedMagnets: issues.filter(i => i.type === 'UNLINKED_MAGNET').length,
        missingFiles: issues.filter(i => i.type === 'MISSING_FILE').length,
        missingContent: issues.filter(i => i.type === 'MISSING_CONTENT').length
      },
      issues: issues
    });
  } catch (error) {
    console.error("파일 검사 실패:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default debugRouter;