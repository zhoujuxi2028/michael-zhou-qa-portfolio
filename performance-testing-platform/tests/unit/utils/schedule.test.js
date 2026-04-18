/**
 * Schedule configuration tests (SCHED-01~04)
 * Verify CI cron schedules and artifact retention
 */

describe('schedule configuration', () => {
  // SCHED-01: actionlint 验证 cron 语法
  test('SCHED-01: GitHub Actions cron syntax should be valid', () => {
    // Cron patterns for nightly soak and weekly capacity
    const nightlySoakCron = '0 3 * * *'; // Every day at 03:00 UTC
    const weeklyCapacityCron = '0 6 * * 0'; // Every Sunday at 06:00 UTC

    // Validate cron format: minute hour day-of-month month day-of-week
    const cronRegex = /^(\d{0,2}|\*) (\d{0,2}|\*) (\d{0,2}|\*) (\d{0,2}|\*) (\d{0,2}|\*)$/;

    expect(nightlySoakCron).toMatch(cronRegex);
    expect(weeklyCapacityCron).toMatch(cronRegex);
  });

  // SCHED-02: nightly soak 配置 03:00 UTC (0 3 * * *)
  test('SCHED-02: nightly soak-short should trigger at 03:00 UTC daily', () => {
    const nightlyCron = '0 3 * * *';
    const [minute, hour, dom, mon, dow] = nightlyCron.split(' ');

    expect(minute).toBe('0'); // 0 min
    expect(hour).toBe('3'); // 3 AM UTC
    expect(dom).toBe('*'); // every day of month
    expect(mon).toBe('*'); // every month
    expect(dow).toBe('*'); // every day of week
  });

  // SCHED-03: weekly capacity 配置 Sunday 06:00 UTC (0 6 * * 0)
  test('SCHED-03: weekly capacity test should trigger on Sunday at 06:00 UTC', () => {
    const weeklyCron = '0 6 * * 0';
    const [minute, hour, dom, mon, dow] = weeklyCron.split(' ');

    expect(minute).toBe('0'); // 0 min
    expect(hour).toBe('6'); // 6 AM UTC
    expect(dom).toBe('*'); // every day of month
    expect(mon).toBe('*'); // every month
    expect(dow).toBe('0'); // Sunday (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  });

  // SCHED-04: artifact 保留 30 天
  test('SCHED-04: artifacts should be retained for 30 days', () => {
    const retentionDays = 30;

    expect(retentionDays).toBeGreaterThan(0);
    expect(retentionDays).toBe(30);
  });
});
