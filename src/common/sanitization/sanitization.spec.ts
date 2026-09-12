/**
 * Plan T7 — bounded input sanitization policy (unit contract).
 *
 * Covers the pure helpers, the field decorators driven through the same
 * class-transformer + class-validator sequence the global ValidationPipe
 * runs (whitelist/forbid semantics preserved), and the real content DTOs
 * they are wired into.
 */
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { IsOptional, IsString, MaxLength, validate } from 'class-validator';
import {
  sanitizeText,
  TextTooLongError,
} from './sanitize-text';
import {
  parseSafeJson,
  MalformedJsonError,
  isJsonLike,
} from './parse-safe-json';
import { SanitizedText } from './sanitized-text.decorator';
import { IsSafeMetadata } from './is-safe-metadata.decorator';
import { CreateCourseDto } from '../../courses/dto/create-course.dto';
import { CreateProjectDto } from '../../projects/dto/create-project.dto';
import { CreateCollectiveMemberDto } from '../../collective/dto/create-collective-member.dto';
import { CreateOrderDto } from '../../orders/dto/create-order.dto';

describe('sanitizeText', () => {
  it('strips a script block, leaving only inert text', () => {
    expect(sanitizeText("<script>alert('x')</script>Selamat")).toBe(
      "alert('x')Selamat",
    );
  });

  it('removes an <img onerror=...> payload entirely', () => {
    expect(sanitizeText('Klik <img src=x onerror=alert(1)> di sini')).toBe(
      'Klik  di sini',
    );
  });

  it('neutralizes tag-reassembly payloads (no live tag survives)', () => {
    for (const evil of [
      '<scr<script>ipt>alert(1)</script>',
      '<<b>script>alert(1)</script>',
      '<img <img src=x onerror=alert(1)> alt>',
    ]) {
      const out = sanitizeText(evil) as string;
      expect(out).not.toMatch(/</);
      expect(out).not.toMatch(/<\s*\/?\s*script/i);
    }
  });

  it('preserves ordinary Unicode content byte-for-byte', () => {
    const plain = 'Élan résumé 日本語 — Ünïcödé 🚀 naïve Ñandú';
    expect(sanitizeText(plain)).toBe(plain);
  });

  it('keeps \t \n \r but removes NUL and other C0 controls', () => {
    expect(sanitizeText('line1\nline2\tTab\r\nNUL\u0000here ESC\u001Bstop')).toBe(
      'line1\nline2\tTab\r\nNULhere ESCstop',
    );
  });

  it('leaves markup intact only when allowHtml is explicitly true', () => {
    expect(sanitizeText('<b>bold</b>', { allowHtml: true })).toBe('<b>bold</b>');
    expect(sanitizeText('<b>bold</b>')).toBe('bold');
  });

  it('throws TextTooLongError when the bound is exceeded (no truncation)', () => {
    expect(() => sanitizeText('x'.repeat(11), { maxLength: 10 })).toThrow(
      TextTooLongError,
    );
    expect(sanitizeText('x'.repeat(10), { maxLength: 10 })).toHaveLength(10);
  });

  it('never echoes the offending value in the rejection message', () => {
    const secret = 'RAHASIA-ISI-YANG-PANJANG'.repeat(10);
    let message = '';
    try {
      sanitizeText(secret, { maxLength: 5 });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).not.toContain('RAHASIA');
  });

  it('is idempotent', () => {
    const once = sanitizeText('<script>a</script>b<i>c');
    expect(sanitizeText(once)).toBe(once);
  });

  it('passes non-string values through untouched', () => {
    expect(sanitizeText(42)).toBe(42);
    expect(sanitizeText(null)).toBe(null);
    expect(sanitizeText(undefined)).toBe(undefined);
  });
});

describe('parseSafeJson / isJsonLike', () => {
  it('accepts complete JSON documents including Unicode strings', () => {
    expect(parseSafeJson('[{"name":"React 🚀"}]')).toEqual([{ name: 'React 🚀' }]);
    expect(parseSafeJson('{"a":1}')).toEqual({ a: 1 });
  });

  it('rejects malformed JSON documents', () => {
    for (const junk of ['[broken', '{,}', '{}extra', '', '   ', '[1,2,']) {
      expect(() => parseSafeJson(junk)).toThrow(MalformedJsonError);
    }
  });

  it('rejects pathologically nested input without crashing', () => {
    expect(() => parseSafeJson('['.repeat(100_000))).toThrow(MalformedJsonError);
  });

  it('enforces maxLength before parsing', () => {
    expect(() => parseSafeJson('[1,2,3]', { maxLength: 4 })).toThrow(
      TextTooLongError,
    );
  });

  it('rejects non-string input', () => {
    expect(() => parseSafeJson({ already: 'parsed' })).toThrow(MalformedJsonError);
  });

  it('flags JSON-shaped strings by their leading bracket', () => {
    expect(isJsonLike(' [{"a":1}]')).toBe(true);
    expect(isJsonLike('[React, Node')).toBe(true);
    expect(isJsonLike('React, TypeScript')).toBe(false);
  });
});

describe('@SanitizedText through the validation pipeline', () => {
  class SampleContentDto {
    @IsOptional()
    @IsString({ message: 'description harus berupa teks string.' })
    @MaxLength(50, { message: 'description maksimal 50 karakter.' })
    @SanitizedText()
    description?: string;
  }

  it('sanitizes before validation and the value passes clean', async () => {
    const dto = plainToInstance(SampleContentDto, {
      description: '<script>alert(1)</script>halo',
    });
    await expect(validate(dto)).resolves.toEqual([]);
    expect(dto.description).toBe('alert(1)halo');
  });

  it('rejects oversized values with a MaxLength failure (400 semantics)', async () => {
    const dto = plainToInstance(SampleContentDto, {
      description: 'y'.repeat(51),
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('description');
  });

  it('leaves optional fields absent untouched', async () => {
    const dto = plainToInstance(SampleContentDto, {});
    await expect(validate(dto)).resolves.toEqual([]);
    expect(dto.description).toBeUndefined();
  });
});

describe('@IsSafeMetadata through the validation pipeline', () => {
  class SampleMetaDto {
    @IsString({ message: 'techStack harus berupa teks string.' })
    @MaxLength(100, { message: 'techStack maksimal 100 karakter.' })
    @IsSafeMetadata()
    techStack?: string;
  }

  it('accepts a valid JSON array and a plain comma-separated list', async () => {
    const good = plainToInstance(SampleMetaDto, {
      techStack: '[{"name":"React"}]',
    });
    await expect(validate(good)).resolves.toEqual([]);

    const legacy = plainToInstance(SampleMetaDto, {
      techStack: 'React, TypeScript, PostgreSQL',
    });
    await expect(validate(legacy)).resolves.toEqual([]);
  });

  it('rejects JSON-shaped-but-broken metadata', async () => {
    for (const junk of ['[React, Node', '{bad}', '[1,2,']) {
      const dto = plainToInstance(SampleMetaDto, { techStack: junk });
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('techStack');
    }
  });

  it('honors a custom validationOptions message over the default', async () => {
    class CustomMessageDto {
      @IsOptional()
      @IsString()
      @IsSafeMetadata({ validationOptions: { message: 'custom-meta-error' } })
      techStack?: string;
    }
    const dto = plainToInstance(CustomMessageDto, { techStack: '[broken' });
    const errors = await validate(dto);
    expect(errors[0].constraints?.isSafeMetadata).toBe('custom-meta-error');
  });
});

describe('real content DTOs opt into the policy', () => {
  it('CreateCourseDto neutralizes a script payload in description', async () => {
    const dto = plainToInstance(CreateCourseDto, {
      title: 'Aman',
      slug: 'aman',
      description: '<script>steal()</script>Belajar aman 🚀',
      price: 1000,
    });
    await expect(validate(dto)).resolves.toEqual([]);
    expect(dto.description).toBe('steal()Belajar aman 🚀');
  });

  it('CreateCourseDto keeps a valid Unicode description byte-identical', async () => {
    const description = 'Belajar Full-Stack & DevOps — 日本語 🚀';
    const dto = plainToInstance(CreateCourseDto, {
      title: 'Full',
      slug: 'full',
      description,
      price: 1000,
    });
    await expect(validate(dto)).resolves.toEqual([]);
    expect(dto.description).toBe(description);
  });

  it('CreateProjectDto neutralizes problem/solution markup and audits title untouched', async () => {
    const dto = plainToInstance(CreateProjectDto, {
      title: 'Portal & <b>Co</b>',
      slug: 'portal',
      problem: '<img src=x onerror=pwn(1)>susah',
      solution: 'solusi "nyata"',
      result: 'naik 2x',
    });
    await expect(validate(dto)).resolves.toEqual([]);
    // Title is a plain-text field: NOT rewritten by the policy.
    expect(dto.title).toBe('Portal & <b>Co</b>');
    // The whole <img ...> tag — handler payload included — is gone.
    expect(dto.problem).toBe('susah');
    expect(dto.solution).toBe('solusi "nyata"');
  });

  it('CreateProjectDto rejects malformed JSON-shaped techStack', async () => {
    const dto = plainToInstance(CreateProjectDto, {
      title: 'P',
      slug: 'p',
      techStack: '[React, Node',
    });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('techStack');
  });

  it('CreateCollectiveMemberDto neutralizes bio and keeps Unicode', async () => {
    const dto = plainToInstance(CreateCollectiveMemberDto, {
      name: 'Siti',
      slug: 'siti',
      role: 'Engineer',
      skills: ['React'],
      bio: '<script>x</script>Insinyur 🚀',
    });
    await expect(validate(dto)).resolves.toEqual([]);
    expect(dto.bio).toBe('xInsinyur 🚀');
  });

  it('CreateOrderDto neutralizes notes markup for user-authored text', async () => {
    const dto = plainToInstance(CreateOrderDto, {
      courseIds: ['3f2504e0-4f89-41d3-9a0c-0305e82c3301'],
      notes: '<script>bad()</script>transfer jam 3',
    });
    await expect(validate(dto)).resolves.toEqual([]);
    expect(dto.notes).toBe('bad()transfer jam 3');
  });
});
