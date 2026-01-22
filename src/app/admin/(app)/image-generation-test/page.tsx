'use client';

import { useState, ChangeEvent } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Upload, X, Share2, ClipboardCopy, Save } from 'lucide-react';
import { generateImage } from '@/ai/flows/generate-image';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { generateSocialMediaPostAction } from '../products/all/actions';
import type { SocialPost, SocialPostPlatform } from '@/lib/types';
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';

export default function ImageGenerationTestPage() {
  const [prompt, setPrompt] = useState('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();
  
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);

  const [contextImagePreview, setContextImagePreview] = useState<string | null>(null);
  const [selectedContextFile, setSelectedContextFile] = useState<File | null>(null);

  // State for the share modal
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isGeneratingPost, setIsGeneratingPost] = useState(false);
  const [isSavingPost, setIsSavingPost] = useState(false);
  const [socialPost, setSocialPost] = useState<{ text: string, imageUrl: string, platform: SocialPostPlatform } | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPostPlatform>('Instagram');

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        setSelectedFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
            setUploadedImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    }
  };
  
  const handleLogoFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        setSelectedLogoFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
            setLogoPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    }
  };

  const handleContextFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        setSelectedContextFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
            setContextImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!prompt) {
      toast({ variant: 'destructive', title: 'Prompt is empty', description: 'Please enter a prompt to generate an image.' });
      return;
    }
    setIsLoading(true);
    setGeneratedImageUrl(null);

    try {
      const result = await generateImage({ 
        prompt,
        imageDataUri: uploadedImagePreview || undefined,
        logoDataUri: logoPreview || undefined,
        contextImageDataUri: contextImagePreview || undefined,
       });
      setGeneratedImageUrl(result.imageUrl);
    } catch (error) {
      console.error('Image generation failed:', error);
      toast({ variant: 'destructive', title: 'Generation Failed', description: 'An error occurred while generating the image.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!generatedImageUrl) return;

    const targetSizeKB = 500;
    const img = document.createElement('img');
    img.src = generatedImageUrl;

    img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            toast({ variant: 'destructive', title: 'Download Failed', description: 'Could not process image.' });
            return;
        }
        ctx.drawImage(img, 0, 0);

        let quality = 0.9;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        
        // Function to get blob size
        const getBlobSize = (dataUrl: string) => {
          const base64 = dataUrl.split(',')[1];
          const decoded = atob(base64);
          return decoded.length / 1024; // size in KB
        }

        while (getBlobSize(dataUrl) > targetSizeKB && quality > 0.1) {
            quality -= 0.1;
            dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `generated-image-${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    img.onerror = () => {
      toast({ variant: 'destructive', title: 'Download Failed', description: 'Could not load generated image for processing.' });
    }
  }

  const handleShareClick = () => {
    if (!generatedImageUrl) return;
    setSocialPost(null); // Reset previous post
    setIsShareModalOpen(true);
  };
  
  const handleGeneratePost = async () => {
    if (!generatedImageUrl) return;
    
    setIsGeneratingPost(true);
    setSocialPost(null);

    const result = await generateSocialMediaPostAction({
      productName: prompt, // Use the image prompt as the "product name"
      description: 'A newly generated AI image.', // Generic description
      price: '', // No price for a generated image
      category: 'Promotion', // A generic category
      platform: selectedPlatform,
    });
    
    setIsGeneratingPost(false);

    if (result.success && result.postText) {
         setSocialPost({
            text: result.postText,
            imageUrl: generatedImageUrl,
            platform: selectedPlatform,
        });
    } else {
        toast({
            variant: 'destructive',
            title: 'AI Generation Failed',
            description: result.error || 'Could not generate the social media post.'
        });
    }
  };

  const handleSavePost = async () => {
    if (!socialPost || !generatedImageUrl || !firestore) return;
    setIsSavingPost(true);

    const socialPostsRef = collection(firestore, 'socialPosts');
    const newPostRef = doc(socialPostsRef);
    
    const newPostData: Omit<SocialPost, 'id'> = {
        productId: `image-gen-${Date.now()}`,
        productName: prompt,
        postText: socialPost.text,
        imageUrl: '', // Start with an empty string, user will fill this.
        platform: socialPost.platform,
        createdAt: new Date().toISOString(),
    };

    try {
        await setDoc(newPostRef, { ...newPostData, id: newPostRef.id });
        toast({ title: 'Post Saved!', description: 'The post has been saved. You can add the final image URL by editing it.' });
        setIsShareModalOpen(false);
    } catch (error) {
        console.error("Save failed:", error);
        if (error instanceof FirebaseError && error.code === 'permission-denied') {
            const contextualError = await FirestorePermissionError.create({
                path: newPostRef.path,
                operation: 'create',
                requestResourceData: newPostData,
            });
            errorEmitter.emit('permission-error', contextualError);
        } else {
             toast({ variant: 'destructive', title: 'Save Failed', description: 'An unexpected error occurred.' });
        }
    } finally {
        setIsSavingPost(false);
    }
  };
  
  const copyPostToClipboard = () => {
    if (socialPost) {
        navigator.clipboard.writeText(socialPost.text);
        toast({ title: 'Copied to clipboard!' });
    }
  }


  return (
    <>
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">AI Image Generation Test</h1>
        <p className="text-muted-foreground">Experiment with generating images from text prompts, optionally based on an uploaded image.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Image Prompt</CardTitle>
          <CardDescription>
            Enter a descriptive prompt. For image-to-image, upload a base image and describe the changes you want to see.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
                <Label htmlFor="prompt">Prompt</Label>
                <Textarea
                    id="prompt"
                    placeholder="e.g., a beautifully marbled raw ribeye steak..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    disabled={isLoading}
                    rows={8}
                />
            </div>
             <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="image-upload">Base Image (Optional)</Label>
                  <Input id="image-upload" type="file" accept="image/*" onChange={handleFileChange} disabled={isLoading} />
                  {uploadedImagePreview && (
                      <div className="mt-4 relative w-full max-w-sm border p-2 rounded-md">
                          <p className="text-sm text-muted-foreground mb-2">Base Image Preview:</p>
                          <Image
                              src={uploadedImagePreview}
                              alt="Uploaded preview"
                              width={200}
                              height={200}
                              className="rounded-md w-full object-contain"
                          />
                          <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-2 right-2 h-6 w-6 rounded-full bg-background/50"
                              onClick={() => { setSelectedFile(null); setUploadedImagePreview(null); }}
                          >
                              <X className="h-4 w-4" />
                          </Button>
                      </div>
                  )}
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="logo-upload">Logo Image (Optional)</Label>
                  <Input id="logo-upload" type="file" accept="image/*" onChange={handleLogoFileChange} disabled={isLoading} />
                  {logoPreview && (
                      <div className="mt-4 relative w-full max-w-sm border p-2 rounded-md">
                          <p className="text-sm text-muted-foreground mb-2">Logo Preview:</p>
                          <Image
                              src={logoPreview}
                              alt="Logo preview"
                              width={200}
                              height={200}
                              className="rounded-md w-full object-contain"
                          />
                          <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-2 right-2 h-6 w-6 rounded-full bg-background/50"
                              onClick={() => { setSelectedLogoFile(null); setLogoPreview(null); }}
                          >
                              <X className="h-4 w-4" />
                          </Button>
                      </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="context-upload">Context Image (Optional)</Label>
                  <Input id="context-upload" type="file" accept="image/*" onChange={handleContextFileChange} disabled={isLoading} />
                  {contextImagePreview && (
                      <div className="mt-4 relative w-full max-w-sm border p-2 rounded-md">
                          <p className="text-sm text-muted-foreground mb-2">Context Image Preview:</p>
                          <Image
                              src={contextImagePreview}
                              alt="Context preview"
                              width={200}
                              height={200}
                              className="rounded-md w-full object-contain"
                          />
                          <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-2 right-2 h-6 w-6 rounded-full bg-background/50"
                              onClick={() => { setSelectedContextFile(null); setContextImagePreview(null); }}
                          >
                              <X className="h-4 w-4" />
                          </Button>
                      </div>
                  )}
                </div>
            </div>
          </div>
          <Button onClick={handleGenerate} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {isLoading ? 'Generating...' : 'Generate Image'}
          </Button>
        </CardContent>
      </Card>

      {(isLoading || generatedImageUrl) && (
        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="w-full aspect-square max-w-lg mx-auto" />
            ) : generatedImageUrl ? (
              <div className="flex flex-col items-center gap-4">
                <Image
                  src={generatedImageUrl}
                  alt="Generated image"
                  width={512}
                  height={512}
                  className="rounded-lg border"
                />
                <div className="flex gap-2">
                    <Button onClick={handleDownload} variant="outline">
                        Download Image (&lt;500KB)
                    </Button>
                    <Button onClick={handleShareClick} variant="secondary">
                        <Share2 className="mr-2 h-4 w-4" />
                        Share...
                    </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
    
    <Dialog open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
        <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
                <DialogTitle>Share Generated Image</DialogTitle>
                <DialogDescription>
                    Generate and save a social media post for this image. The original prompt will be used as the title.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="flex items-center gap-4">
                    <div className="w-1/3 space-y-2">
                        <Label htmlFor="platform">Platform</Label>
                        <Select value={selectedPlatform} onValueChange={(v) => setSelectedPlatform(v as SocialPostPlatform)}>
                            <SelectTrigger id="platform">
                                <SelectValue placeholder="Select platform" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Instagram">Instagram</SelectItem>
                                <SelectItem value="Facebook">Facebook</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button onClick={handleGeneratePost} disabled={isGeneratingPost} className="self-end">
                        {isGeneratingPost ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                        {isGeneratingPost ? 'Generating...' : 'Generate Post'}
                    </Button>
                </div>

                {isGeneratingPost ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : socialPost ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                        <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
                            <Image src={socialPost.imageUrl} alt={prompt} fill className="object-contain" />
                        </div>
                        <div className="flex flex-col gap-4">
                            <Textarea
                                readOnly
                                value={socialPost.text}
                                className="h-full w-full flex-grow text-sm"
                                rows={15}
                            />
                        </div>
                    </div>
                ) : null}
            </div>
             <DialogFooter>
                {socialPost && !isGeneratingPost && (
                    <div className="flex justify-end gap-2 w-full">
                        <Button variant="outline" onClick={copyPostToClipboard}>
                           <ClipboardCopy className="mr-2 h-4 w-4" /> Copy
                        </Button>
                        <Button onClick={handleSavePost} disabled={isSavingPost}>
                            {isSavingPost ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            {isSavingPost ? 'Saving...' : 'Save to Collection'}
                        </Button>
                    </div>
                )}
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}
