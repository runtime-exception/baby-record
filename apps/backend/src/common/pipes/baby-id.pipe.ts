import { Injectable, PipeTransform } from '@nestjs/common';
import { parseBabyId } from '../utils/baby-id.util';

@Injectable()
export class BabyIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    return parseBabyId(value);
  }
}
