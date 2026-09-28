// Nón/trụ đứng một mình: hình dạng thiết diện qua trục phải ĐÚNG trên hình (đo toạ độ).
import { dung3d, dist, goc, gan } from '../../__tests__/helpers/toaDo3d';

const coneOf = (st: any) => Object.values(st.objects).find((o: any) => o.kind === 'cone3d') as any;
const cylOf = (st: any) => Object.values(st.objects).find((o: any) => o.kind === 'cylinder3d') as any;

describe('thiết diện qua trục', () => {
  it('nón: thiết diện qua trục là tam giác vuông cân → góc ở đỉnh 90°, h = r', () => {
    const { P, state } = dung3d('Cắt hình nón đỉnh S bởi mặt phẳng đi qua trục ta được một tam giác vuông cân có cạnh huyền bằng a√2.');
    expect(gan(goc(P.A, P.S, P.B), 90)).toBe(true);
    expect(gan(dist(P.S, P.O), coneOf(state).attrs.radius)).toBe(true);
    expect(gan(dist(P.O, P.A), coneOf(state).attrs.radius)).toBe(true);
  });
  it('nón: thiết diện qua trục là tam giác đều → SA = SB = AB', () => {
    const { P } = dung3d('Cho hình nón đỉnh S có thiết diện qua trục là tam giác đều cạnh 2a.');
    expect(gan(dist(P.S, P.A), dist(P.A, P.B))).toBe(true);
    expect(gan(dist(P.S, P.B), dist(P.A, P.B))).toBe(true);
  });
  it('nón: góc ở đỉnh bằng 120° → góc ASB = 120°', () => {
    const { P } = dung3d('Cho hình nón đỉnh S có góc ở đỉnh bằng 120°, thiết diện qua trục là tam giác SAB.');
    expect(gan(goc(P.A, P.S, P.B), 120)).toBe(true);
  });
  it('trụ: thiết diện qua trục là hình vuông → chiều cao = đường kính', () => {
    const { P, state } = dung3d('Cho hình trụ có thiết diện qua trục là một hình vuông, diện tích mỗi mặt đáy bằng 9π.');
    const c = cylOf(state);
    expect(gan(dist(P.O, P.I), 2 * c.attrs.radius)).toBe(true);
  });
  it('không nêu hình dạng → giữ kích thước mặc định (r = 1.4, h = 2.4)', () => {
    const { P, state } = dung3d('Cho hình nón đỉnh S có bán kính đáy bằng a.');
    expect(gan(coneOf(state).attrs.radius, 1.4)).toBe(true);
    expect(gan(dist(P.S, P.O), 2.4)).toBe(true);
  });
});
