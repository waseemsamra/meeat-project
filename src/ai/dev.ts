
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-product-description.ts';
import '@/ai/flows/create-order.ts';
import '@/ai/flows/curate-box-flow.ts';
import '@/ai/flows/generate-image.ts';
import '@/ai/flows/generate-social-post.ts';
import '@/ai/flows/generate-video-flow.ts';
import '@/ai/flows/suggest-currency.ts';
import '@/ai/flows/translate-product.ts';
