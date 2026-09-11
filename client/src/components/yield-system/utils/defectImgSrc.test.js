import { resolveDefectImgSrc } from './defectImgSrc';

describe('resolveDefectImgSrc', () => {
  test('外部直連 URL 原樣回傳，不可被 media/public marker 切割', () => {
    const url = 'javascript:void(0)';
    expect(resolveDefectImgSrc(url)).toBe(url);
    expect(resolveDefectImgSrc('https://example.com/a/public/b.jpg'))
      .toBe('https://example.com/a/public/b.jpg');
  });

  test('新的本機路徑（media marker）取尾巴組相對 URL', () => {
    expect(resolveDefectImgSrc('/home/deeyo/proj/client/media/yield/static/df_img/2026-08-14/L1-X/abc.jpg'))
      .toBe('./yield/static/df_img/2026-08-14/L1-X/abc.jpg');
  });

  test('歷史本機路徑（public marker + Windows 反斜線）也要能轉', () => {
    expect(resolveDefectImgSrc('C:\\proj\\client\\public\\yield\\static\\df_img\\2025-01-02\\L2\\x.jpg'))
      .toBe('./yield/static/df_img/2025-01-02/L2/x.jpg');
  });

  test('沒有副檔名時補 .jpg（舊 getImageAndSave 沿用遠端原檔名可能無副檔名）', () => {
    expect(resolveDefectImgSrc('/x/client/media/yield/static/df_img/2026-08-14/L1/abc123'))
      .toBe('./yield/static/df_img/2026-08-14/L1/abc123.jpg');
  });

  test('無圖的各種佔位值一律回 null', () => {
    for (const v of ['NA', 'NoImg.jpg', '', '   ', null, undefined]) {
      expect(resolveDefectImgSrc(v)).toBeNull();
    }
  });
});
