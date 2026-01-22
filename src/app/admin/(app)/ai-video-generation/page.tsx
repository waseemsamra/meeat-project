'use client';

import { useState, ChangeEvent } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, X, Clapperboard, Download } from 'lucide-react';
import { generateVideo } from '@/ai/flows/generate-video-flow';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Image from 'next/image';
import { Slider } from '@/components/ui/slider';

export default function VideoGenerationPage() {
  const [prompt, setPrompt] = useState('');
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [contextImagePreview, setContextImagePreview] = useState<string | null>(null);
  const [selectedContextFile, setSelectedContextFile] = useState<File | null>(null);

  const [duration, setDuration] = useState(8);

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
      toast({ variant: 'destructive', title: 'Prompt is empty', description: 'Please enter a prompt to generate a video.' });
      return;
    }
    if (!selectedFile) {
        toast({ variant: 'destructive', title: 'Image missing', description: 'Please upload a base image to generate the video from.' });
        return;
    }
    setIsLoading(true);
    setGeneratedVideoUrl(null);

    try {
      const result = await generateVideo({ 
        prompt,
        imageDataUri: uploadedImagePreview || undefined,
        contextImageDataUri: contextImagePreview || undefined,
        durationSeconds: duration,
       });
      setGeneratedVideoUrl(result.videoUrl);
      toast({ title: 'Video Generated!', description: 'Your silent video is ready. This might take a minute to load.' });
    } catch (error) {
      console.error('Video generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while generating the video.';
      toast({ variant: 'destructive', title: 'Generation Failed', description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!generatedVideoUrl) return;
    const link = document.createElement('a');
    link.href = generatedVideoUrl;
    link.download = `generated-video-${Date.now()}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">AI Video Generation</h1>
        <p className="text-muted-foreground">Generate a short silent video from an image and a text prompt.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Video Prompt</CardTitle>
          <CardDescription>
            Upload a base image and describe the scene or action you want to see. Add an optional context image for better results.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="prompt">Prompt</Label>
                    <Textarea
                        id="prompt"
                        placeholder="e.g., A gentle breeze rustles the leaves, with birds chirping softly."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        disabled={isLoading}
                        rows={8}
                    />
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="duration">Duration ({duration}s)</Label>
                  <Slider
                    id="duration"
                    min={5}
                    max={8}
                    step={1}
                    value={[duration]}
                    onValueChange={(value) => setDuration(value[0])}
                    disabled={isLoading}
                  />
                   <p className="text-xs text-muted-foreground">The current model supports a maximum of 8 seconds.</p>
                </div>
            </div>
             <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="image-upload">Base Image *</Label>
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
                  <Label htmlFor="context-image-upload">Context Image (Optional)</Label>
                  <Input id="context-image-upload" type="file" accept="image/*" onChange={handleContextFileChange} disabled={isLoading} />
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
            {isLoading ? 'Generating Video (this can take a minute)...' : 'Generate Video'}
          </Button>
        </CardContent>
      </Card>

      {(isLoading || generatedVideoUrl) && (
        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
                <div className="flex flex-col items-center gap-4">
                    <Skeleton className="w-full aspect-video max-w-lg mx-auto" />
                    <p className="text-muted-foreground text-sm">Please be patient, video generation is a slow process and may take a minute or more.</p>
                </div>
            ) : generatedVideoUrl ? (
              <div className="flex flex-col items-center gap-4">
                <video
                  src={generatedVideoUrl}
                  controls
                  className="rounded-lg border w-full max-w-lg"
                />
                <div className="flex gap-2">
                    <Button onClick={handleDownload} variant="outline">
                        <Download className="mr-2 h-4 w-4" />
                        Download Video
                    </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
    </>
  );
}
