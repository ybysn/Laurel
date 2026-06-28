/// 模块职责：本地 Markdown 文件读写 command。
/// 输入：文件路径、Markdown 内容。
/// 输出：MarkdownFilePayload 或错误信息。
/// 风险点：文件不存在、编码错误、权限不足必须返回可展示错误；严禁 panic。

use serde::Serialize;
use std::fs;
use std::path::Path;
use std::process::Command;

/// 受保护的系统目录前缀（禁止直接操作）。
const PROTECTED_PREFIXES: &[&str] = &[
    "C:\\Windows", "/System", "/etc", "/bin", "/sbin",
    "/usr/bin", "/usr/sbin", "/Library/System", "/boot",
];

/// 校验传入路径的安全性：禁止父目录穿越、相对路径、系统目录操作。
fn validate_path_safe(path: &Path) -> Result<(), String> {
    let path_str = path.to_string_lossy();

    // 1. 禁止相对路径
    if path.is_relative() {
        return Err(format!("不允许相对路径: {}", path_str));
    }

    // 2. 禁止父目录穿越
    for component in path.components() {
        if let std::path::Component::ParentDir = component {
            return Err(format!("路径包含非法字符 (..): {}", path_str));
        }
    }

    // 3. 禁止操作系统关键目录
    for prefix in PROTECTED_PREFIXES {
        if path_str.starts_with(prefix) {
            return Err(format!("不允许操作系统目录: {}", path_str));
        }
    }

    Ok(())
}

/// 读取 Markdown 文件后返回的负载结构。
#[derive(Serialize, Clone)]
pub struct MarkdownFilePayload {
    pub path: String,
    pub file_name: String,
    pub content: String,
}

/// 校验文件扩展名，仅允许 .md 和 .markdown。
fn validate_markdown_extension(path: &Path) -> Result<(), String> {
    match path.extension().and_then(|e| e.to_str()) {
        Some("md") | Some("markdown") => Ok(()),
        Some(ext) => Err(format!(
            "不支持的文件扩展名: .{}，仅支持 .md 和 .markdown",
            ext
        )),
        None => Err("文件没有扩展名，仅支持 .md 和 .markdown 文件".to_string()),
    }
}

/// 读取本地 Markdown 文件并返回其路径、文件名和 UTF-8 内容。
/// 只允许读取 .md 或 .markdown 文件，非 UTF-8 编码会返回错误。
#[tauri::command]
pub fn read_markdown_file(path: String) -> Result<MarkdownFilePayload, String> {
    let path_buf = Path::new(&path);
    validate_path_safe(path_buf)?;
    validate_markdown_extension(path_buf)?;

    if !path_buf.exists() {
        return Err(format!("文件不存在: {}", path));
    }

    let bytes = fs::read(path_buf).map_err(|e| format!("读取文件失败: {}", e))?;

    let content = String::from_utf8(bytes).map_err(|e| {
        format!(
            "文件编码不是 UTF-8，无法打开。错误位置: byte {}",
            e.utf8_error().valid_up_to()
        )
    })?;

    let file_name = path_buf
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();

    Ok(MarkdownFilePayload {
        path,
        file_name,
        content,
    })
}

/// 将 Markdown 内容写入指定路径的 .md 文件。
/// 采用先写临时文件再替换的策略，防止写入中断导致原文件损坏。
#[tauri::command]
pub fn write_markdown_file(path: String, content: String) -> Result<(), String> {
    let path_buf = Path::new(&path);
    validate_path_safe(path_buf)?;
    validate_markdown_extension(path_buf)?;

    if let Some(parent) = path_buf.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| format!("创建目录失败: {}", e))?;
        }
    }

    let tmp_path = path_buf.with_extension("md.tmp");
    fs::write(&tmp_path, content.as_bytes())
        .map_err(|e| format!("写入临时文件失败: {}", e))?;

    fs::rename(&tmp_path, path_buf).map_err(|e| format!("保存文件失败: {}", e))?;

    Ok(())
}

/// 检查指定路径的文件是否存在。
#[tauri::command]
pub fn file_exists(path: String) -> Result<bool, String> {
    let path_buf = Path::new(&path);
    validate_path_safe(path_buf)?;
    Ok(path_buf.exists())
}

/// 工作区文件树节点。
#[derive(Serialize, Clone)]
pub struct MarkdownTreeItem {
    pub path: String,
    pub file_name: String,
    pub relative_path: String,
    pub is_dir: bool,
    pub children: Option<Vec<MarkdownTreeItem>>,
}

const IGNORED_DIRS: &[&str] = &[
    "node_modules", ".git", "target", "dist", "build", ".next", "out",
];

fn is_ignored_dir(name: &str) -> bool {
    IGNORED_DIRS.contains(&name) || name.ends_with(".assets")
}

fn scan_dir(dir: &Path, base_dir: &Path, depth: u32) -> Vec<MarkdownTreeItem> {
    let mut items: Vec<MarkdownTreeItem> = Vec::new();

    if depth > 5 {
        return items;
    }

    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return items,
    };

    let mut dirs: Vec<MarkdownTreeItem> = Vec::new();
    let mut files: Vec<MarkdownTreeItem> = Vec::new();

    for entry in entries.flatten() {
        let path = entry.path();
        let name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();

        if path.is_dir() {
            if is_ignored_dir(&name) {
                continue;
            }
            let children = scan_dir(&path, base_dir, depth + 1);
            if children.is_empty() {
                continue;
            }
            let relative_path = path
                .strip_prefix(base_dir)
                .unwrap_or(&path)
                .to_string_lossy()
                .to_string();
            dirs.push(MarkdownTreeItem {
                path: path.to_string_lossy().to_string(),
                file_name: name,
                relative_path,
                is_dir: true,
                children: Some(children),
            });
        } else {
            let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
            if ext != "md" && ext != "markdown" {
                continue;
            }
            let relative_path = path
                .strip_prefix(base_dir)
                .unwrap_or(&path)
                .to_string_lossy()
                .to_string();
            files.push(MarkdownTreeItem {
                path: path.to_string_lossy().to_string(),
                file_name: name,
                relative_path,
                is_dir: false,
                children: None,
            });
        }
    }

    dirs.sort_by(|a, b| a.file_name.to_lowercase().cmp(&b.file_name.to_lowercase()));
    files.sort_by(|a, b| a.file_name.to_lowercase().cmp(&b.file_name.to_lowercase()));

    items.extend(dirs);
    items.extend(files);
    items
}

#[tauri::command]
pub fn list_markdown_files_in_folder(
    folder_path: String,
) -> Result<Vec<MarkdownTreeItem>, String> {
    let path_buf = Path::new(&folder_path);
    validate_path_safe(path_buf)?;

    if !path_buf.exists() {
        return Err(format!("文件夹不存在: {}", folder_path));
    }
    if !path_buf.is_dir() {
        return Err(format!("路径不是文件夹: {}", folder_path));
    }

    Ok(scan_dir(path_buf, path_buf, 0))
}

/// 将文本内容写入 .html 文件。
#[tauri::command]
pub fn write_html_file(path: String, content: String) -> Result<(), String> {
    let path_buf = Path::new(&path);
    validate_path_safe(path_buf)?;

    match path_buf.extension().and_then(|e| e.to_str()) {
        Some("html") | Some("htm") => {}
        Some(ext) => return Err(format!("不支持的文件扩展名: .{}，仅支持 .html / .htm", ext)),
        None => return Err("文件没有扩展名".to_string()),
    }

    if let Some(parent) = path_buf.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("创建目录失败: {}", e))?;
        }
    }

    let tmp_path = path_buf.with_extension("html.tmp");
    fs::write(&tmp_path, content.as_bytes())
        .map_err(|e| format!("写入临时文件失败: {}", e))?;
    fs::rename(&tmp_path, path_buf)
        .map_err(|e| format!("保存文件失败: {}", e))?;

    Ok(())
}

/// 跨平台查找 Chromium 系浏览器可执行文件路径。
fn find_browser() -> Option<String> {
    #[cfg(target_os = "windows")]
    {
        let candidates = [
            r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
            r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
            r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        ];
        for candidate in &candidates {
            if Path::new(candidate).exists() {
                return Some(candidate.to_string());
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        let candidates = [
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
            "/Applications/Chromium.app/Contents/MacOS/Chromium",
        ];
        for candidate in &candidates {
            if Path::new(candidate).exists() {
                return Some(candidate.to_string());
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        let candidates = [
            "google-chrome", "google-chrome-stable", "chromium", "chromium-browser",
            "microsoft-edge", "microsoft-edge-stable",
        ];
        for candidate in &candidates {
            if std::process::Command::new("which")
                .arg(candidate)
                .output()
                .map(|o| o.status.success())
                .unwrap_or(false)
            {
                return Some(candidate.to_string());
            }
        }
    }

    None
}

/// 将 HTML 内容直接导出为 PDF。
#[tauri::command]
pub fn export_html_to_pdf(html: String, output_path: String) -> Result<(), String> {
    let pdf_path = Path::new(&output_path);
    validate_path_safe(pdf_path)?;

    match pdf_path.extension().and_then(|e| e.to_str()) {
        Some("pdf") => {}
        Some(ext) => return Err(format!("不支持的文件扩展名: .{}，仅支持 .pdf", ext)),
        None => return Err("文件没有扩展名".to_string()),
    }

    if let Some(parent) = pdf_path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("创建目录失败: {}", e))?;
        }
    }

    let browser = find_browser()
        .ok_or_else(|| "未找到可用的 Edge 或 Chrome 浏览器，无法直接导出 PDF。请安装 Edge 或 Chrome 后重试。".to_string())?;

    let tmp_html = pdf_path.with_extension("pdf.tmp.html");
    fs::write(&tmp_html, html.as_bytes())
        .map_err(|e| format!("写入临时 HTML 失败: {}", e))?;

    let status = Command::new(&browser)
        .args([
            "--headless=new",
            "--disable-gpu",
            "--no-sandbox",
            "--print-to-pdf-no-header",
            &format!("--print-to-pdf={}", output_path),
        ])
        .arg(&tmp_html)
        .status()
        .map_err(|e| format!("启动浏览器失败 ({}): {}", browser, e))?;

    let _ = fs::remove_file(&tmp_html);

    if !status.success() {
        return Err(format!(
            "浏览器进程异常退出 (code: {})，PDF 生成失败",
            status.code().unwrap_or(-1)
        ));
    }

    if !pdf_path.exists() {
        return Err("PDF 文件未生成，浏览器可能不支持 --print-to-pdf".to_string());
    }

    Ok(())
}

/// 创建空 Markdown 文件。
#[tauri::command]
pub fn create_markdown_file(path: String) -> Result<(), String> {
    let path_buf = Path::new(&path);
    validate_path_safe(path_buf)?;
    validate_markdown_extension(path_buf)?;

    if path_buf.exists() {
        return Err(format!("文件已存在: {}", path));
    }
    if let Some(parent) = path_buf.parent() {
        if !parent.exists() {
            return Err(format!("父目录不存在: {}", parent.display()));
        }
    }
    fs::write(path_buf, b"").map_err(|e| format!("创建文件失败: {}", e))?;
    Ok(())
}

/// 创建文件夹。
#[tauri::command]
pub fn create_folder(path: String) -> Result<(), String> {
    let path_buf = Path::new(&path);
    validate_path_safe(path_buf)?;

    if path_buf.exists() {
        return Err(format!("目录已存在: {}", path));
    }
    if let Some(parent) = path_buf.parent() {
        if !parent.exists() {
            return Err(format!("父目录不存在: {}", parent.display()));
        }
    }
    fs::create_dir(path_buf).map_err(|e| format!("创建目录失败: {}", e))?;
    Ok(())
}

/// 重命名文件或目录。
#[tauri::command]
pub fn rename_path(old_path: String, new_path: String) -> Result<(), String> {
    let old = Path::new(&old_path);
    let new = Path::new(&new_path);
    validate_path_safe(old)?;
    validate_path_safe(new)?;

    if !old.exists() {
        return Err(format!("路径不存在: {}", old_path));
    }
    if new.exists() {
        return Err(format!("目标路径已存在: {}", new_path));
    }
    if new_path.contains(".assets") {
        return Err("不允许重命名到 .assets 目录".to_string());
    }
    fs::rename(old, new).map_err(|e| format!("重命名失败: {}", e))?;
    Ok(())
}

const PROTECTED_DIRS: &[&str] = &[".git", "node_modules", "target", "dist", "build"];

/// 删除文件或目录。
#[tauri::command]
pub fn delete_path(path: String) -> Result<(), String> {
    let path_buf = Path::new(&path);
    validate_path_safe(path_buf)?;

    if !path_buf.exists() {
        return Err(format!("路径不存在: {}", path));
    }
    let name = path_buf.file_name().and_then(|n| n.to_str()).unwrap_or("");
    if PROTECTED_DIRS.contains(&name) || name.ends_with(".assets") {
        return Err(format!("不允许删除: {}", name));
    }
    if path_buf.is_dir() {
        fs::remove_dir_all(path_buf).map_err(|e| format!("删除目录失败: {}", e))?;
    } else {
        fs::remove_file(path_buf).map_err(|e| format!("删除文件失败: {}", e))?;
    }
    Ok(())
}
