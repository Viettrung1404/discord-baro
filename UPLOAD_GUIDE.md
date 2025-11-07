# 📤 HƯỚNG DẪN SỬ DỤNG FILE UPLOAD

## ✅ ĐÃ HOÀN THÀNH

Mình đã tích hợp **File Upload** vào `MessageFileModal`. Giờ bạn có thể:

1. ✅ Upload file lên MinIO
2. ✅ Preview file trước khi gửi
3. ✅ Gửi file kèm tin nhắn trong channel
4. ✅ Support nhiều loại file (images, PDFs, docs, videos, audio)

---

## 🎯 CÁCH SỬ DỤNG

### **1. Mở Modal Upload**

Trong chat input, click vào icon **"+"** hoặc **paperclip** để mở modal upload.

Code đã có sẵn trong `components/chat/chat-input.tsx`:

```typescript
onClick={() => onOpen("messageFile", { 
    apiUrl: `/api/channels/${channelId}/messages`,
    query: { channelId, serverId }
})}
```

### **2. Upload File**

1. Click vào vùng drag-drop hoặc click "Click to upload"
2. Chọn file từ máy tính
3. Chờ upload hoàn tất (có loading spinner)
4. File sẽ hiển thị preview với:
   - Tên file
   - Kích thước
   - Link preview

### **3. Gửi File**

1. Sau khi upload xong, click button **"Send"**
2. File sẽ được gửi như một message trong channel
3. Modal tự động đóng

---

## 🔧 TÍNH NĂNG

### **File Types Supported:**
- ✅ Images: jpg, jpeg, png, webp, gif
- ✅ Documents: pdf, txt, doc, docx
- ✅ Videos: mp4, webm
- ✅ Audio: mp3, wav

### **Validations:**
- ✅ Max file size: **50MB**
- ✅ Virus scan (nếu cấu hình)
- ✅ Secure filename generation
- ✅ Rate limiting per user

### **MinIO Features:**
- ✅ Upload to MinIO object storage
- ✅ Auto-generate secure URLs
- ✅ User-specific folders (`userId/messageAttachment/...`)
- ✅ Metadata tracking (upload time, user info, IP)

---

## 📝 CODE FLOW

```
User clicks "+" icon
    ↓
Modal opens (MessageFileModal)
    ↓
User selects file
    ↓
Upload to /api/upload (POST)
    ↓
MinIO processes & returns fileUrl
    ↓
User clicks "Send"
    ↓
POST to /api/channels/[channelId]/messages
    ↓
Message saved with fileUrl
    ↓
Socket.IO broadcasts to all users
    ↓
UI updates in realtime
```

---

## 🐛 TROUBLESHOOTING

### **Lỗi: "Upload failed"**
- Kiểm tra MinIO đang chạy: `docker ps`
- Check env variables trong `.env.local`:
  ```
  MINIO_ENDPOINT=localhost:9000
  MINIO_ACCESS_KEY=minioadmin
  MINIO_SECRET_KEY=minioadmin123
  ```

### **Lỗi: "File too large"**
- Max size: 50MB cho message attachments
- Có thể thay đổi trong `app/api/upload/route.ts`:
  ```typescript
  messageAttachment: {
    maxSize: 50 * 1024 * 1024, // 50MB → thay đổi số này
  }
  ```

### **File không hiển thị sau khi gửi**
- Check API route `/api/channels/[channelId]/messages` có lưu `fileUrl` không
- Xem console log để debug

---

## 🎨 CUSTOMIZATION

### **Thêm File Types:**

Trong `app/api/upload/route.ts`, update:

```typescript
messageAttachment: {
  allowedTypes: [
    // Thêm MIME types ở đây
    'application/zip',
    'application/x-rar-compressed',
  ],
  allowedExtensions: [
    // Thêm extensions ở đây
    'zip', 'rar',
  ]
}
```

### **Thay đổi UI:**

Trong `components/modals/message-file-modal.tsx`:

```typescript
// Màu background drop zone
className="bg-zinc-50 hover:bg-zinc-100"

// Icon file
<FileIcon className="w-10 h-10 text-blue-500" />

// Button style
<Button variant="default">Send</Button>
```

---

## 🚀 NEXT STEPS

### **1. Hiển thị file trong chat**

Tạo component `FileAttachment`:

```typescript
// components/chat/file-attachment.tsx
export const FileAttachment = ({ fileUrl, fileName }: { 
  fileUrl: string; 
  fileName: string;
}) => {
  const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(fileName);
  
  if (isImage) {
    return (
      <img 
        src={fileUrl} 
        alt={fileName}
        className="max-w-sm rounded-lg"
      />
    );
  }
  
  return (
    <a 
      href={fileUrl} 
      target="_blank"
      className="flex items-center p-3 bg-zinc-100 rounded"
    >
      <FileIcon className="w-6 h-6 mr-2" />
      <span>{fileName}</span>
    </a>
  );
};
```

### **2. Thêm progress bar**

```typescript
const [uploadProgress, setUploadProgress] = useState(0);

// Use XMLHttpRequest for progress tracking
const xhr = new XMLHttpRequest();
xhr.upload.addEventListener('progress', (e) => {
  setUploadProgress((e.loaded / e.total) * 100);
});
```

### **3. Multiple files**

Thay đổi input:

```typescript
<Input
  type="file"
  multiple  // ← Thêm này
  onChange={handleFileUpload}
/>
```

---

## 📚 REFERENCE

- MinIO Docs: https://min.io/docs/minio/linux/developers/javascript/API.html
- React Hook Form: https://react-hook-form.com/
- Zustand (Modal Store): https://zustand-demo.pmnd.rs/

---

## ✅ CHECKLIST

- [x] API Route `/api/upload` hoạt động
- [x] MinIO connection established
- [x] MessageFileModal component hoàn chỉnh
- [x] Chat input integration
- [x] Form validation
- [x] Loading states
- [x] Error handling
- [ ] Display file attachments in chat (TODO)
- [ ] Delete uploaded files (TODO)
- [ ] Progress bar (TODO)

Nếu có lỗi, gửi log cho mình nhé! 🚀


