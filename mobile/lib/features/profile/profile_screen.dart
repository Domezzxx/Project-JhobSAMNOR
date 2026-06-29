import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/theme.dart';
import '../../core/api/api_client.dart';
import '../../core/money.dart';
import '../auth/auth_controller.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authControllerProvider).user;
    return Scaffold(
      appBar: AppBar(title: const Text('ฉัน', style: TextStyle(fontWeight: FontWeight.bold))),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Center(
            child: Column(
              children: [
                const CircleAvatar(
                  radius: 42,
                  backgroundColor: AppColors.chipBg,
                  child: Icon(Icons.person_rounded, size: 44, color: AppColors.primary),
                ),
                const SizedBox(height: 12),
                Text(user?.displayName ?? 'ผู้ใช้',
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.textDark)),
                const SizedBox(height: 2),
                Text(user?.email ?? '', style: const TextStyle(color: AppColors.textMuted)),
              ],
            ),
          ),
          const SizedBox(height: 28),
          _InfoRow(
            icon: Icons.account_balance_wallet_rounded,
            label: 'รายได้ต่อเดือน',
            value: user != null ? Money.formatBaht(user.monthlyIncome) : '-',
          ),
          _InfoRow(
            icon: Icons.local_fire_department_rounded,
            label: 'Streak',
            value: '${user?.streak ?? 0} วัน',
          ),
          _InfoRow(icon: Icons.star_rounded, label: 'Level', value: '${user?.level ?? 1}'),
          const SizedBox(height: 24),
          const Text('เชื่อมต่อ',
              style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.textDark)),
          const SizedBox(height: 12),
          const _GmailCard(),
          const SizedBox(height: 28),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.expense),
            onPressed: () async {
              await ref.read(authControllerProvider.notifier).logout();
              if (context.mounted) context.go('/login');
            },
            icon: const Icon(Icons.logout),
            label: const Text('ออกจากระบบ'),
          ),
          const SizedBox(height: 16),
          const Center(
            child: Text('พี่เงิน · ที่ปรึกษาการเงิน AI', style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
          ),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.icon, required this.label, required this.value});
  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: softCard(),
      child: Row(
        children: [
          Icon(icon, color: AppColors.primary),
          const SizedBox(width: 12),
          Text(label, style: const TextStyle(color: AppColors.textMuted)),
          const Spacer(),
          Text(value, style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.textDark)),
        ],
      ),
    );
  }
}

/// การ์ด "ดูดรายการจากอีเมลธนาคาร" — เชื่อม Gmail (OAuth) แล้ว sync รายการอัตโนมัติ
class _GmailCard extends ConsumerStatefulWidget {
  const _GmailCard();
  @override
  ConsumerState<_GmailCard> createState() => _GmailCardState();
}

class _GmailCardState extends ConsumerState<_GmailCard> {
  bool _busy = false;

  void _snack(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  String _err(Object e) {
    if (e is DioException && e.response?.data is Map) {
      return '${(e.response!.data as Map)['error'] ?? e.message}';
    }
    return '$e';
  }

  Future<void> _connect() async {
    setState(() => _busy = true);
    try {
      final res = await ref.read(dioProvider).get('/integrations/gmail/connect');
      final url = '${res.data['url']}';
      if (!mounted) return;
      showDialog<void>(
        context: context,
        builder: (_) => AlertDialog(
          title: const Text('เชื่อม Gmail'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                  'เปิดลิงก์นี้ในเบราว์เซอร์เพื่ออนุญาตให้อ่านอีเมลธนาคาร (อ่านอย่างเดียว) แล้วกลับมากด "ดูดรายการ"'),
              const SizedBox(height: 12),
              SelectableText(url,
                  style: const TextStyle(fontSize: 12, color: AppColors.primary)),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('ปิด')),
          ],
        ),
      );
    } catch (e) {
      _snack(_err(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _sync() async {
    setState(() => _busy = true);
    try {
      final res = await ref.read(dioProvider).post('/integrations/gmail/sync');
      _snack('ดูดแล้ว: สแกน ${res.data['scanned']} เมล · ลงรายการ ${res.data['imported']} รายการ');
    } catch (e) {
      _snack(_err(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: softCard(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.mark_email_read_rounded, color: AppColors.primary),
              SizedBox(width: 12),
              Expanded(
                child: Text('ดูดรายการจากอีเมลธนาคาร',
                    style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.textDark)),
              ),
            ],
          ),
          const SizedBox(height: 6),
          const Text(
            'เชื่อม Gmail แล้วระบบจะอ่านอีเมลแจ้งเตือนธนาคารมาลงรายการให้อัตโนมัติ',
            style: TextStyle(color: AppColors.textMuted, fontSize: 13),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _busy ? null : _connect,
                  icon: const Icon(Icons.link_rounded, size: 18),
                  label: const Text('เชื่อม Gmail'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: _busy ? null : _sync,
                  icon: _busy
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Icon(Icons.download_rounded, size: 18),
                  label: const Text('ดูดรายการ'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
