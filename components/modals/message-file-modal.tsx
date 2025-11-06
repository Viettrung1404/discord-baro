"use client";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState } from "react";
import axios from "axios";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";

import {
    Form,
    FormControl,
    FormField,
    FormItem,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useModal } from "@/hooks/use-modal-store";
import { Input } from "@/components/ui/input";
import { X, FileIcon, Loader2, Upload, Image, Video, FileText } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const formSchema = z.object({
    fileUrls: z.array(z.string()).min(1, { message: "At least one file is required" }),
});

interface UploadedFile {
    fileUrl: string;
    fileName: string;
    fileType: string;
    fileSize: number;
}

export const MessageFileModal = () => {
    const { isOpen, onClose, type, data } = useModal();
    const { apiUrl, query } = data;
    
    const isModalOpen = isOpen && type === "messageFile";
    const router = useRouter();
    
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const MAX_FILES = 5;
    
    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            fileUrls: []
        },
    });

    const handleClose = () => {
        form.reset();
        setUploadedFiles([]);
        setUploadProgress(0);
        onClose();
    };

    const getFileIcon = (fileType: string) => {
        if (fileType.startsWith('image/')) return <Image className="w-8 h-8 text-blue-500" />;
        if (fileType.startsWith('video/')) return <Video className="w-8 h-8 text-purple-500" />;
        if (fileType.startsWith('audio/')) return <FileText className="w-8 h-8 text-green-500" />;
        return <FileIcon className="w-8 h-8 text-zinc-500" />;
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
        return (bytes / 1024 / 1024).toFixed(2) + ' MB';
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        if (files.length === 0) return;

        // Check if adding these files would exceed the limit
        if (uploadedFiles.length + files.length > MAX_FILES) {
            alert(`Chỉ được upload tối đa ${MAX_FILES} files! Bạn đã có ${uploadedFiles.length} files.`);
            return;
        }

        // Check individual file sizes
        const oversizedFiles = files.filter(f => f.size > 50 * 1024 * 1024);
        if (oversizedFiles.length > 0) {
            alert(`Các file sau quá lớn (>50MB): ${oversizedFiles.map(f => f.name).join(', ')}`);
            return;
        }

        setUploading(true);
        setUploadProgress(0);
        
        try {
            const newFiles: UploadedFile[] = [];
            
            // Upload files one by one with progress
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                
                console.log(`📁 Uploading file ${i + 1}/${files.length}:`, {
                    name: file.name,
                    type: file.type,
                    size: formatFileSize(file.size)
                });

                const formData = new FormData();
                formData.append('file', file);
                formData.append('type', 'messageAttachment');

                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    console.error('❌ Upload API error:', errorData);
                    throw new Error(`Failed to upload ${file.name}: ${errorData.error}`);
                }

                const result = await response.json();
                console.log(`✅ Upload success (${i + 1}/${files.length}):`, result);
                
                newFiles.push({
                    fileUrl: result.fileUrl,
                    fileName: file.name,
                    fileType: file.type,
                    fileSize: file.size,
                });

                // Update progress
                setUploadProgress(((i + 1) / files.length) * 100);
            }
            
            // Add new files to the list
            const updatedFiles = [...uploadedFiles, ...newFiles];
            setUploadedFiles(updatedFiles);
            
            // Update form value
            form.setValue('fileUrls', updatedFiles.map(f => f.fileUrl));
            
        } catch (error) {
            console.error('Upload error:', error);
            alert(`Upload failed: ${error}`);
        } finally {
            setUploading(false);
            setUploadProgress(0);
            // Reset input
            event.target.value = '';
        }
    };

    const handleRemoveFile = (index: number) => {
        const updatedFiles = uploadedFiles.filter((_, i) => i !== index);
        setUploadedFiles(updatedFiles);
        form.setValue('fileUrls', updatedFiles.map(f => f.fileUrl));
    };

    const isLoading = form.formState.isSubmitting;
    
    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            const url = apiUrl || "/api/socket/messages";

            // Send each file as a separate message
            for (const file of uploadedFiles) {
                const payload = {
                    content: `📎 ${file.fileName}`,
                    fileUrl: file.fileUrl,
                    serverId: query?.serverId,
                    channelId: query?.channelId,
                };

                console.log("Sending file message:", { url, payload });
                await axios.post(url, payload);
            }
            
            form.reset();
            setUploadedFiles([]);
            router.refresh();
            handleClose();
        }
        catch (error) {
            console.error("Error sending files:", error);
            if (axios.isAxiosError(error)) {
                console.error("Response data:", error.response?.data);
                alert(`Failed to send files: ${error.response?.data?.error || error.message}`);
            } else {
                alert("Failed to send files");
            }
        }
    };
    return (
        <Dialog open={isModalOpen} onOpenChange={handleClose}>
            <DialogContent className="bg-white text-black p-0 overflow-hidden max-w-2xl max-h-[80vh]">
                <DialogHeader className="pt-8 px-6">
                    <DialogTitle className="text-2xl text-center font-bold">
                        Add attachments
                    </DialogTitle>
                    <DialogDescription className="text-center text-zinc-500">
                        Upload up to {MAX_FILES} files (50MB each)
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-4 px-6 max-h-[50vh] overflow-y-auto">
                            <FormField
                                control={form.control}
                                name="fileUrls"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <div className="flex flex-col space-y-4">
                                                {/* Upload Area */}
                                                {uploadedFiles.length < MAX_FILES && (
                                                    <div className="flex flex-col items-center justify-center w-full">
                                                        <label 
                                                            htmlFor="file-upload" 
                                                            className="flex flex-col items-center justify-center w-full h-32 border-2 border-zinc-300 border-dashed rounded-lg cursor-pointer bg-zinc-50 hover:bg-zinc-100 transition"
                                                        >
                                                            <div className="flex flex-col items-center justify-center py-4">
                                                                <Upload className="w-8 h-8 mb-2 text-zinc-400" />
                                                                <p className="mb-1 text-sm text-zinc-500">
                                                                    <span className="font-semibold">Click to upload</span> or drag and drop
                                                                </p>
                                                                <p className="text-xs text-zinc-400">
                                                                    {uploadedFiles.length}/{MAX_FILES} files • Images, Videos, PDFs, Docs (MAX 50MB)
                                                                </p>
                                                            </div>
                                                            <Input
                                                                id="file-upload"
                                                                type="file"
                                                                multiple
                                                                onChange={handleFileUpload}
                                                                disabled={uploading || uploadedFiles.length >= MAX_FILES}
                                                                accept="image/*,application/pdf,.txt,.doc,.docx,.mp4,.webm,.mp3,.wav"
                                                                className="hidden"
                                                            />
                                                        </label>
                                                        
                                                        {/* Progress Bar */}
                                                        {uploading && (
                                                            <div className="w-full mt-4 space-y-2">
                                                                <div className="flex items-center justify-between text-sm">
                                                                    <span className="text-blue-600 flex items-center">
                                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                                        Uploading...
                                                                    </span>
                                                                    <span className="text-zinc-500">{uploadProgress.toFixed(0)}%</span>
                                                                </div>
                                                                <Progress value={uploadProgress} className="w-full" />
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* File List */}
                                                {uploadedFiles.length > 0 && (
                                                    <div className="space-y-2">
                                                        <h4 className="text-sm font-medium text-zinc-700">
                                                            Uploaded Files ({uploadedFiles.length})
                                                        </h4>
                                                        <div className="space-y-2">
                                                            {uploadedFiles.map((file, index) => (
                                                                <div 
                                                                    key={index}
                                                                    className="relative flex items-center p-3 border rounded-lg bg-zinc-50 hover:bg-zinc-100 transition group"
                                                                >
                                                                    {/* File Icon */}
                                                                    <div className="flex-shrink-0">
                                                                        {getFileIcon(file.fileType)}
                                                                    </div>
                                                                    
                                                                    {/* File Info */}
                                                                    <div className="flex-1 ml-3 min-w-0">
                                                                        <p className="text-sm font-medium text-zinc-900 truncate">
                                                                            {file.fileName}
                                                                        </p>
                                                                        <p className="text-xs text-zinc-500">
                                                                            {formatFileSize(file.fileSize)} • {file.fileType.split('/')[1]?.toUpperCase()}
                                                                        </p>
                                                                    </div>

                                                                    {/* Preview Link */}
                                                                    <a
                                                                        href={file.fileUrl}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-xs text-blue-600 hover:underline mr-2 hidden group-hover:block"
                                                                    >
                                                                        Preview
                                                                    </a>
                                                                    
                                                                    {/* Remove Button */}
                                                                    <button
                                                                        onClick={() => handleRemoveFile(index)}
                                                                        type="button"
                                                                        className="flex-shrink-0 bg-rose-500 text-white p-1.5 rounded-full shadow-sm hover:bg-rose-600 transition"
                                                                        disabled={uploading}
                                                                    >
                                                                        <X className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>
                        
                        <DialogFooter className="bg-gray-100 px-6 py-4">
                            <Button 
                                disabled={isLoading || uploadedFiles.length === 0 || uploading} 
                                variant="default"
                                type="submit"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Sending {uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''}...
                                    </>
                                ) : (
                                    `Send ${uploadedFiles.length} file${uploadedFiles.length > 1 ? 's' : ''}`
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};