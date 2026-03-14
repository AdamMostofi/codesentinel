from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
from datetime import datetime
from app.database import get_db, engine, Base
from app.models.scan import Scan, Vulnerability
from app.services.file_handler import FileHandler
from app.services.scanner import SecurityScanner
from app.core.config import settings
import uuid
import traceback

Base.metadata.create_all(bind=engine)

router = APIRouter()
file_handler = FileHandler(settings.TEMP_UPLOAD_DIR)


@router.post("/scan")
async def create_scan(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Upload a .zip file to start a new security scan.
    """
    if not file.filename or not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only .zip files are allowed")

    scan_id = str(uuid.uuid4())

    content = await file.read()

    if len(content) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=400, detail="File size must be less than 50MB")

    try:
        result = file_handler.handle_upload(content, file.filename, scan_id)

        scan = Scan(
            id=scan_id,
            project_name=file.filename,
            status="scanning",
            file_path=result["extract_dir"],
        )
        db.add(scan)
        db.commit()
        db.refresh(scan)

        try:
            scanner = SecurityScanner(result["extract_dir"])
            scan_results = scanner.scan()

            for vuln in scan_results["vulnerabilities"]:
                vulnerability = Vulnerability(
                    id=str(uuid.uuid4()),
                    scan_id=scan_id,
                    tool=vuln.get("tool", "unknown"),
                    severity=vuln.get("severity", "LOW"),
                    title=vuln.get("title", "Unknown"),
                    description=vuln.get("description", ""),
                    file_path=vuln.get("file_path", ""),
                    line_number=vuln.get("line_number", 0),
                    code_snippet=vuln.get("code_snippet", ""),
                    remediation=vuln.get("remediation", ""),
                    raw_output=vuln.get("raw_output", ""),
                )
                db.add(vulnerability)

            scan.status = "completed"
            scan.risk_score = scan_results["risk_score"]
            scan.completed_at = datetime.utcnow()
            db.commit()

            return {
                "id": scan_id,
                "project_name": file.filename,
                "status": "completed",
                "risk_score": scan_results["risk_score"],
                "vulnerability_count": scan_results["total"],
                "vulnerabilities_by_severity": scan_results["by_severity"],
                "message": "Scan completed successfully",
            }

        except Exception as scan_error:
            scan.status = "failed"
            scan.error_message = str(scan_error)
            scan.completed_at = datetime.utcnow()
            db.commit()
            raise HTTPException(
                status_code=500, detail=f"Scan failed: {str(scan_error)}"
            )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        file_handler.cleanup(scan_id)
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")


@router.get("/scans")
async def get_scans(db: Session = Depends(get_db)):
    """
    Get list of all scans.
    """
    scans = db.query(Scan).order_by(Scan.created_at.desc()).all()
    return {
        "scans": [
            {
                "id": s.id,
                "project_name": s.project_name,
                "status": s.status,
                "risk_score": s.risk_score,
                "created_at": s.created_at.isoformat() if s.created_at else None,
                "completed_at": s.completed_at.isoformat() if s.completed_at else None,
            }
            for s in scans
        ],
        "total": len(scans),
    }


@router.get("/scan/{scan_id}")
async def get_scan(scan_id: str, db: Session = Depends(get_db)):
    """
    Get detailed information about a specific scan.
    """
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    vulns = db.query(Vulnerability).filter(Vulnerability.scan_id == scan_id).all()

    return {
        "id": scan.id,
        "project_name": scan.project_name,
        "status": scan.status,
        "risk_score": scan.risk_score,
        "file_path": scan.file_path,
        "created_at": scan.created_at.isoformat() if scan.created_at else None,
        "completed_at": scan.completed_at.isoformat() if scan.completed_at else None,
        "error_message": scan.error_message,
        "vulnerabilities": [
            {
                "id": v.id,
                "tool": v.tool,
                "severity": v.severity,
                "title": v.title,
                "description": v.description,
                "file_path": v.file_path,
                "line_number": v.line_number,
                "code_snippet": v.code_snippet,
                "remediation": v.remediation,
            }
            for v in vulns
        ],
        "vulnerability_count": len(vulns),
    }


@router.delete("/scan/{scan_id}")
async def delete_scan(scan_id: str, db: Session = Depends(get_db)):
    """
    Delete a scan and its associated files.
    """
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    db.query(Vulnerability).filter(Vulnerability.scan_id == scan_id).delete()

    db.delete(scan)
    db.commit()

    file_handler.cleanup(scan_id)

    return {"message": f"Scan {scan_id} deleted successfully"}
