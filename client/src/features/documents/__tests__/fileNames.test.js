import { describe, expect, it } from 'vitest';
import { downloadName, fileName, nameWithoutExtension } from '../fileNames.js';

describe('file names', () => {
  it('shows the member’s own name, else the uploaded one', () => {
    expect(fileName({ label: 'Papa Aadhaar', originalName: 'IMG_2041.jpg' })).toBe('Papa Aadhaar');
    expect(fileName({ label: '', originalName: 'IMG_2041.jpg' })).toBe('IMG_2041.jpg');
  });

  it('downloads under the shown name, keeping the extension once', () => {
    expect(downloadName({ label: 'Papa Aadhaar', originalName: 'IMG_2041.jpg' })).toBe('Papa Aadhaar.jpg');
    expect(downloadName({ label: 'bill.PDF', originalName: 'scan.pdf' })).toBe('bill.PDF');
    expect(downloadName({ label: 'पापा का आधार', originalName: 'a.png' })).toBe('पापा का आधार.png');
    expect(downloadName({ label: '', originalName: 'scan.pdf' })).toBe('scan.pdf');
  });

  it('drops the extension to start a rename', () => {
    expect(nameWithoutExtension('IMG_2041.jpg')).toBe('IMG_2041');
    expect(nameWithoutExtension('no-extension')).toBe('no-extension');
    expect(nameWithoutExtension('')).toBe('');
  });
});
