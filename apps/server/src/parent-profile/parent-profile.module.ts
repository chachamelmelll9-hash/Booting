import { Module } from '@nestjs/common';

import { CommonModule } from '../common/common.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { ConsentService } from './consent.service';
import { ConsentPageController } from './consent-page.controller';
import { ParentProfileController } from './parent-profile.controller';
import { ParentProfileService } from './parent-profile.service';
import { PhotosService } from './photos.service';
import { ReviewService } from './review.service';

@Module({
  imports: [SupabaseModule, CommonModule],
  controllers: [ParentProfileController, ConsentPageController],
  providers: [ParentProfileService, PhotosService, ConsentService, ReviewService],
  exports: [ParentProfileService, PhotosService],
})
export class ParentProfileModule {}
