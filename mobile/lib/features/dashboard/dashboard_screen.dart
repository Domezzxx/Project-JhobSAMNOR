import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:fl_chart/fl_chart.dart';

import '../../app/theme.dart';
import '../../core/money.dart';
import '../auth/auth_controller.dart';
import '../transactions/transaction.dart';
import '../transactions/transactions_repository.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authControllerProvider).user;
    final dashboard = ref.watch(dashboardProvider);
    final period = ref.watch(dashboardPeriodProvider);

    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            await ref.read(transactionsRepoProvider).syncPending();
            ref.invalidate(dashboardProvider);
            ref.invalidate(budgetsListProvider);
            await ref.read(dashboardProvider.future);
          },
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text('สวัสดี ${user?.displayName ?? 'เพื่อน'}! 👋',
                        style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
                  ),
                  _StreakChip(streak: user?.streak ?? 0),
                  IconButton(
                    tooltip: 'ออกจากระบบ',
                    onPressed: () async {
                      await ref.read(authControllerProvider.notifier).logout();
                      if (context.mounted) context.go('/login');
                    },
                    icon: const Icon(Icons.logout, color: AppColors.textMuted),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              dashboard.when(
                loading: () => const Padding(
                  padding: EdgeInsets.all(40),
                  child: Center(child: CircularProgressIndicator()),
                ),
                error: (e, _) => _ErrorBox(message: '$e', onRetry: () => ref.invalidate(dashboardProvider)),
                data: (d) {
                  final now = DateTime.now();

                  // Calculate date range based on selection
                  DateTime start;
                  DateTime end;

                  if (period == DashboardPeriod.day) {
                    start = DateTime(now.year, now.month, now.day);
                    end = start.add(const Duration(days: 1));
                  } else if (period == DashboardPeriod.week) {
                    final day = now.weekday; // 1 is Monday, 7 is Sunday
                    start = DateTime(now.year, now.month, now.day - (day - 1));
                    end = start.add(const Duration(days: 7));
                  } else {
                    // month
                    start = DateTime(now.year, now.month, 1);
                    end = DateTime(now.year, now.month + 1, 1);
                  }

                  // Filter transactions in range
                  final filteredTxns = d.items.where((t) {
                    return t.occurredAt.isAfter(start.subtract(const Duration(seconds: 1))) && 
                           t.occurredAt.isBefore(end);
                  }).toList();

                  // Calculate income, expense, and balance
                  int periodIncome = 0;
                  int periodExpense = 0;
                  for (final t in filteredTxns) {
                    if (t.type == 'income') {
                      periodIncome += t.amount;
                    } else {
                      periodExpense += t.amount;
                    }
                  }
                  final periodBalance = periodIncome - periodExpense;

                  // Group expenses by category
                  final expenseTxns = filteredTxns.where((t) => t.type == 'expense');
                  final Map<String, ({Category? category, int amount})> categorySums = {};
                  for (final t in expenseTxns) {
                    final catId = t.category?.id ?? 'other';
                    if (!categorySums.containsKey(catId)) {
                      categorySums[catId] = (category: t.category, amount: 0);
                    }
                    final existingVal = categorySums[catId]!;
                    categorySums[catId] = (category: existingVal.category, amount: existingVal.amount + t.amount);
                  }

                  final sortedCategories = categorySums.values.toList()
                    ..sort((a, b) => b.amount.compareTo(a.amount));

                  String periodLabel = 'คงเหลือเดือนนี้';
                  if (period == DashboardPeriod.day) periodLabel = 'คงเหลือวันนี้';
                  if (period == DashboardPeriod.week) periodLabel = 'คงเหลือสัปดาห์นี้';

                  return Column(
                    children: [
                      // 1. Period Selector Toggle
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.only(bottom: 16),
                        child: SegmentedButton<DashboardPeriod>(
                          style: const ButtonStyle(
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          ),
                          segments: const [
                            ButtonSegment(value: DashboardPeriod.day, label: Text('วัน')),
                            ButtonSegment(value: DashboardPeriod.week, label: Text('สัปดาห์')),
                            ButtonSegment(value: DashboardPeriod.month, label: Text('เดือน')),
                          ],
                          selected: {period},
                          onSelectionChanged: (s) => ref.read(dashboardPeriodProvider.notifier).state = s.first,
                        ),
                      ),
                      // 2. Balance Card (Cash-Flow)
                      _BalanceCard(
                        balance: periodBalance,
                        income: periodIncome,
                        expense: periodExpense,
                        periodLabel: periodLabel,
                      ),
                      const SizedBox(height: 16),
                      // 3. Category Pie Chart
                      _CategoryPieChart(
                        categorySums: sortedCategories,
                        totalExpense: periodExpense,
                      ),
                      const SizedBox(height: 16),
                      // 4. Budgets Section
                      const _BudgetsProgressSection(),
                      const SizedBox(height: 16),
                      const _CoachTeaser(),
                      const SizedBox(height: 24),
                      const Align(
                        alignment: Alignment.centerLeft,
                        child: Text('รายการในช่วงเวลา', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      ),
                      const SizedBox(height: 8),
                      if (filteredTxns.isEmpty)
                        const Padding(
                          padding: EdgeInsets.all(24),
                          child: Text('ไม่มีรายการในช่วงเวลานี้', style: TextStyle(color: AppColors.textMuted)),
                        )
                      else
                        ...filteredTxns.take(15).map((t) => _TxnTile(txn: t)),
                    ],
                  );
                },
              ),
            ],
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          await context.push('/add');
          ref.invalidate(dashboardProvider);
        },
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: const Text('เพิ่มรายการ'),
      ),
    );
  }
}

class _StreakChip extends StatelessWidget {
  const _StreakChip({required this.streak});
  final int streak;
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(color: const Color(0xFFFFF0E6), borderRadius: BorderRadius.circular(20)),
      child: Text('🔥 $streak วัน', style: const TextStyle(fontWeight: FontWeight.w600)),
    );
  }
}

class _BalanceCard extends StatelessWidget {
  const _BalanceCard({
    required this.balance,
    required this.income,
    required this.expense,
    required this.periodLabel,
  });
  
  final int balance;
  final int income;
  final int expense;
  final String periodLabel;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppColors.primary, AppColors.primaryDark],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(periodLabel, style: const TextStyle(color: Colors.white70)),
          const SizedBox(height: 4),
          Text(Money.formatBaht(balance),
              style: const TextStyle(color: Colors.white, fontSize: 34, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(child: _MiniStat(label: 'รายรับ', value: income)),
              Expanded(child: _MiniStat(label: 'รายจ่าย', value: expense)),
            ],
          ),
        ],
      ),
    );
  }
}

class _MiniStat extends StatelessWidget {
  const _MiniStat({required this.label, required this.value});
  final String label;
  final int value;
  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(color: Colors.white70, fontSize: 12)),
        Text(Money.formatBaht(value),
            style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w600)),
      ],
    );
  }
}

class _CategoryPieChart extends StatelessWidget {
  const _CategoryPieChart({
    required this.categorySums,
    required this.totalExpense,
  });

  final List<({Category? category, int amount})> categorySums;
  final int totalExpense;

  List<PieChartSectionData> getSections() {
    return categorySums.map((item) {
      final cat = item.category;
      final color = cat != null ? hexColor(cat.color) : const Color(0xFF8E9AA6);
      final percentage = totalExpense > 0 ? (item.amount / totalExpense) * 100 : 0.0;
      
      return PieChartSectionData(
        color: color,
        value: item.amount.toDouble(),
        title: percentage >= 10 ? '${percentage.toStringAsFixed(0)}%' : '',
        radius: 35,
        titleStyle: const TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.bold,
          color: Colors.white,
        ),
      );
    }).toList();
  }

  List<PieChartSectionData> getPlaceholderSections() {
    return [
      PieChartSectionData(
        color: Colors.grey.shade200,
        value: 100,
        title: 'ไม่มีรายจ่าย',
        radius: 35,
        titleStyle: TextStyle(
          color: Colors.grey.shade500,
          fontSize: 10,
          fontWeight: FontWeight.bold,
        ),
      )
    ];
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('สัดส่วนรายจ่าย', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.textDark)),
          const SizedBox(height: 12),
          Row(
            children: [
              SizedBox(
                height: 100,
                width: 100,
                child: PieChart(
                  PieChartData(
                    sectionsSpace: 2,
                    centerSpaceRadius: 18,
                    sections: totalExpense > 0 ? getSections() : getPlaceholderSections(),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: totalExpense > 0
                      ? categorySums.take(4).map((item) {
                          final cat = item.category;
                          final color = cat != null ? hexColor(cat.color) : const Color(0xFF8E9AA6);
                          final percentage = (item.amount / totalExpense) * 100;
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 6),
                            child: Row(
                              children: [
                                Container(
                                  width: 10,
                                  height: 10,
                                  decoration: BoxDecoration(color: color, shape: BoxShape.circle),
                                ),
                                const SizedBox(width: 6),
                                Text(cat?.icon ?? '💸', style: const TextStyle(fontSize: 12)),
                                const SizedBox(width: 4),
                                Expanded(
                                  child: Text(
                                    cat?.nameTh ?? 'อื่นๆ',
                                    style: const TextStyle(fontSize: 12, color: AppColors.textDark),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                Text(
                                  '${percentage.toStringAsFixed(0)}%',
                                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textDark),
                                ),
                              ],
                            ),
                          );
                        }).toList()
                      : [
                          const Text(
                            'ไม่มีประวัติการใช้จ่ายสำหรับช่วงนี้',
                            style: TextStyle(color: AppColors.textMuted, fontSize: 12),
                          )
                        ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _BudgetsProgressSection extends ConsumerWidget {
  const _BudgetsProgressSection();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final budgetsAsync = ref.watch(budgetsListProvider);
    final budgetStatuses = ref.watch(budgetStatusProvider);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('งบประมาณ', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.textDark)),
              IconButton(
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
                icon: const Icon(Icons.settings, size: 18, color: AppColors.primary),
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('หน้าจัดการงบประมาณจะมาใน Sprint ถัดไป 💸')),
                  );
                },
              ),
            ],
          ),
          const SizedBox(height: 8),
          budgetsAsync.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => Text('โหลดงบไม่ได้: $e'),
            data: (budgets) {
              if (budgets.isEmpty) {
                return const Padding(
                  padding: EdgeInsets.symmetric(vertical: 8),
                  child: Center(
                    child: Text(
                      'ยังไม่ได้ตั้งงบประมาณ — เริ่มใช้งานได้เลย',
                      style: TextStyle(color: AppColors.textMuted, fontSize: 12),
                    ),
                  ),
                );
              }

              return Column(
                children: budgetStatuses.map((status) {
                  final cat = status.category;
                  final isExceeded = status.isExceeded;
                  final color = isExceeded ? AppColors.expense : AppColors.primary;
                  final limitText = Money.formatBaht(status.amount);
                  final spentText = Money.formatBaht(status.spent);
                  
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            CircleAvatar(
                              radius: 14,
                              backgroundColor: cat != null ? hexColor(cat.color).withOpacity(0.15) : const Color(0xFFEFEFF5),
                              child: Text(cat?.icon ?? '💸', style: const TextStyle(fontSize: 12)),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                cat?.nameTh ?? 'งบรวมทั้งหมด',
                                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppColors.textDark),
                              ),
                            ),
                            if (isExceeded)
                              Container(
                                margin: const EdgeInsets.only(right: 8),
                                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                                decoration: BoxDecoration(
                                  color: AppColors.expense.withOpacity(0.15),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: const Row(
                                  children: [
                                    Icon(Icons.warning, size: 10, color: AppColors.expense),
                                    SizedBox(width: 2),
                                    Text('เกินงบ! ⚠️', style: TextStyle(color: AppColors.expense, fontSize: 9, fontWeight: FontWeight.bold)),
                                  ],
                                ),
                              ),
                            Text(
                              '$spentText / $limitText',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: isExceeded ? AppColors.expense : AppColors.textDark,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(4),
                          child: LinearProgressIndicator(
                            value: status.percentage.clamp(0.0, 1.0),
                            minHeight: 6,
                            backgroundColor: Colors.grey.shade100,
                            color: color,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              status.period == 'weekly' ? 'รายสัปดาห์' : 'รายเดือน',
                              style: const TextStyle(fontSize: 10, color: AppColors.textMuted),
                            ),
                            Text(
                              isExceeded 
                                  ? 'ใช้เกินงบไปแล้ว ${Money.formatBaht(status.spent - status.amount)}'
                                  : 'เหลืออีก ${Money.formatBaht(status.amount - status.spent)}',
                              style: TextStyle(
                                fontSize: 10, 
                                color: isExceeded ? AppColors.expense : AppColors.textMuted,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  );
                }).toList(),
              );
            },
          ),
        ],
      ),
    );
  }
}

class _CoachTeaser extends StatelessWidget {
  const _CoachTeaser();
  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(20),
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: () => context.push('/chat'),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: const [
              CircleAvatar(backgroundColor: Color(0xFFEDEBFF), child: Text('🤖')),
              SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('คุยกับพี่เงิน',
                        style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.textDark)),
                    Text('ถามเรื่องเงินได้เลย — แตะเพื่อเริ่มแชท 💬',
                        style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
                  ],
                ),
              ),
              Icon(Icons.chevron_right, color: AppColors.textMuted),
            ],
          ),
        ),
      ),
    );
  }
}

class _TxnTile extends ConsumerWidget {
  const _TxnTile({required this.txn});
  final Txn txn;

  void _showOptions(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(Icons.edit, color: AppColors.primary),
                title: const Text('แก้ไขรายการ'),
                onTap: () async {
                  Navigator.pop(context);
                  await GoRouter.of(context).push('/add', extra: txn);
                  ref.invalidate(dashboardProvider);
                },
              ),
              ListTile(
                leading: const Icon(Icons.delete, color: AppColors.expense),
                title: const Text('ลบรายการ', style: TextStyle(color: AppColors.expense)),
                onTap: () async {
                  Navigator.pop(context);
                  final confirm = await showDialog<bool>(
                    context: context,
                    builder: (context) => AlertDialog(
                      title: const Text('ยืนยันการลบ'),
                      content: const Text('คุณต้องการลบรายการนี้ใช่หรือไม่?'),
                      actions: [
                        TextButton(
                          onPressed: () => Navigator.pop(context, false),
                          child: const Text('ยกเลิก'),
                        ),
                        TextButton(
                          onPressed: () => Navigator.pop(context, true),
                          child: const Text('ลบ', style: TextStyle(color: AppColors.expense)),
                        ),
                      ],
                    ),
                  );
                  if (confirm == true) {
                    try {
                      await ref.read(transactionsRepoProvider).delete(txn.id);
                      ref.invalidate(dashboardProvider);
                    } catch (e) {
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('ลบไม่สำเร็จ: $e')),
                        );
                      }
                    }
                  }
                },
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = txn.category;
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      elevation: 0,
      color: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => _showOptions(context, ref),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              CircleAvatar(
                backgroundColor: c != null ? hexColor(c.color).withOpacity(0.15) : const Color(0xFFEFEFF5),
                child: Text(c?.icon ?? '💸'),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(c?.nameTh ?? (txn.isIncome ? 'รายรับ' : 'รายจ่าย'),
                        style: const TextStyle(fontWeight: FontWeight.w600)),
                    if (txn.note != null && txn.note!.isNotEmpty)
                      Text(txn.note!, style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
                  ],
                ),
              ),
              Text('${txn.isIncome ? '+' : '-'}${Money.formatBaht(txn.amount)}',
                  style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: txn.isIncome ? AppColors.income : AppColors.expense)),
            ],
          ),
        ),
      ),
    );
  }
}

class _ErrorBox extends StatelessWidget {
  const _ErrorBox({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        const SizedBox(height: 20),
        const Text('โหลดข้อมูลไม่ได้ 😢'),
        const SizedBox(height: 4),
        Text(message,
            style: const TextStyle(color: AppColors.textMuted, fontSize: 12), textAlign: TextAlign.center),
        const SizedBox(height: 12),
        OutlinedButton(onPressed: onRetry, child: const Text('ลองใหม่')),
        const SizedBox(height: 8),
        const Text('ตรวจว่า backend รันที่ API_BASE_URL หรือยัง',
            style: TextStyle(fontSize: 11, color: AppColors.textMuted)),
      ],
    );
  }
}
