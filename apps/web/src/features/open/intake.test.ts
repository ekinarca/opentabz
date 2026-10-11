import { describe, expect, it } from 'vitest';
import { fileSource, nameFromDownload, parseHttpUrl, textSource } from './intake.ts';

describe('intake', () => {
  it('accepts only http(s) URLs', () => {
    expect(parseHttpUrl(' https://example.com/a.gp ')?.href).toBe('https://example.com/a.gp');
    expect(parseHttpUrl('http://example.com/a.gp5')).not.toBeNull();
    expect(parseHttpUrl('javascript:alert(1)')).toBeNull();
    expect(parseHttpUrl('file:///etc/passwd')).toBeNull();
    expect(parseHttpUrl('not a url')).toBeNull();
    expect(parseHttpUrl('')).toBeNull();
  });

  it('names downloads from Content-Disposition, then the URL path', () => {
    const url = new URL('https://example.com/files/My%20Song.gp?download=1');
    expect(nameFromDownload(url, null)).toBe('My Song.gp');
    expect(nameFromDownload(url, 'attachment; filename="tab.gp5"')).toBe('tab.gp5');
    expect(nameFromDownload(url, "attachment; filename*=UTF-8''Caf%C3%A9.gpx")).toBe('Café.gpx');
    expect(nameFromDownload(new URL('https://example.com/'), null)).toBe('example.com');
  });

  it('reads files and text into bytes', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'x.gp5');
    const loaded = await fileSource(file).load();
    expect(loaded.ok && new Uint8Array(loaded.bytes)).toEqual(new Uint8Array([1, 2, 3]));
    const text = await textSource('Pasted text', 'é').load();
    expect(text.ok && new Uint8Array(text.bytes)).toEqual(new Uint8Array([0xc3, 0xa9]));
  });
});
