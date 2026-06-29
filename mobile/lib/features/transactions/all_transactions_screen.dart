import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/theme.dart';
import '../../core/money.dart';
import 'transactions_repository.dart';

final _txnFilterProvider = StateProvider.autoDispose<String>((_) => 'all');

const _sourceLabels = {
  'all': 'ทั้งหมด',
  'statement': 'Statement',
  'email': 'อีเมล',
  'manual': 'กรอกเอง',
  'ocr': 'สลิป',
};

/// หน้าดูรายการทั้งหมด (ทุกเดือน) + กรองตามแหล่งที่มา — ใช้ดูข้อมูลที่นำเข้าจาก statement/อีเมล
class AllTransactionsScreen extends ConsumerWidget {
  const AllTransactionsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dash = ref.watch(dashboardProvider);
    final filter = ref.watch(_txnFilterProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('รายการทั้งหมด', style: TextStyle(fontWeight: FontWeight.bold))),
      body: dash.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('โหลดไม่ได้: $e')),
        data: (d) {
          final items = [...d.items]..sort((a, b) => b.occurredAt.compareTo(a.occurredAt));
          final filtered = filter == 'all' ? items : items.where((t) => t.source == filter).toList();

          return Column(
            children: [
              SizedBox(
                height: 52,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  children: _sourceLabels.entries.map((e) {
                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
                      child: ChoiceChip(
                        label: Text(e.value),
                        selected: filter == e.key,
                        onSelected: (_) => ref.read(_txnFilterProvider.notifier).state = e.key,
                      ),
                    );
                  }).toList(),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: Text('${filtered.length} รายการ',
                      style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
                ),
              ),
              Expanded(
                child: filtered.isEmpty
                    ? const Center(child: Text('ไม่มีรายการ', style: TextStyle(color: AppColors.textMuted)))
                    : ListView.builder(
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                        itemCount: filtered.length,
                        itemBuilder: (_, i) {
                          final t = filtered[i];
                          return Container(
                            margin: const EdgeInsets.only(bottom: 8),
                            padding: const EdgeInsets.all(14),
                            decoration: softCard(),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        t.note ?? t.category?.nameTh ?? 'รายการ',
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(
                                            fontWeight: FontWeight.w600, color: AppColors.textDark),
                                      ),
                                      const SizedBox(height: 3),
                                      Text(
                                        '${t.occurredAt.toIso8601String().substring(0, 10)} · ${_sourceLabels[t.source] ?? t.source}',
                                        style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                                      ),
                                    ],
                                  ),
                                ),
                                Text(
                                  '${t.isIncome ? '+' : '-'}${Money.formatBaht(t.amount)}',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    color: t.isIncome ? AppColors.primary : AppColors.expense,
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
              ),
            ],
          );
        },
      ),
    );
  }
}
