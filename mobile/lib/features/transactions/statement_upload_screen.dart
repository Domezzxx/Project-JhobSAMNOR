import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/theme.dart';
import '../../core/api/api_client.dart';

/// อัปโหลด e-Statement PDF (+รหัส) → backend ถอด → parse → ลงรายการ
class StatementUploadScreen extends ConsumerStatefulWidget {
  const StatementUploadScreen({super.key});
  @override
  ConsumerState<StatementUploadScreen> createState() => _StatementUploadScreenState();
}

class _StatementUploadScreenState extends ConsumerState<StatementUploadScreen> {
  final _password = TextEditingController();
  String? _fileName;
  List<int>? _bytes;
  bool _busy = false;
  String? _result;
  String? _error;

  @override
  void dispose() {
    _password.dispose();
    super.dispose();
  }

  Future<void> _pick() async {
    try {
      // ไม่กรองชนิดไฟล์ (เลี่ยงปัญหา dialog ไม่โชว์ไฟล์บนเว็บ) — ตรวจ .pdf ทีหลัง
      final res = await FilePicker.pickFiles(withData: true);
      if (res == null || res.files.isEmpty) {
        if (mounted) {
          ScaffoldMessenger.of(context)
              .showSnackBar(const SnackBar(content: Text('ยังไม่ได้เลือกไฟล์')));
        }
        return;
      }
      final f = res.files.first;
      setState(() {
        _fileName = f.name;
        _bytes = f.bytes;
        _result = null;
        _error = f.bytes == null ? 'อ่านไฟล์ไม่ได้ ลองเลือกใหม่' : null;
      });
    } catch (e) {
      if (mounted) setState(() => _error = 'เลือกไฟล์ไม่สำเร็จ: $e');
    }
  }

  Future<void> _upload() async {
    if (_bytes == null) return;
    setState(() {
      _busy = true;
      _result = null;
      _error = null;
    });
    try {
      final res = await ref.read(dioProvider).post(
        '/integrations/statement/import',
        data: {
          'fileBase64': base64Encode(_bytes!),
          if (_password.text.isNotEmpty) 'password': _password.text,
        },
      );
      setState(() => _result =
          'นำเข้าสำเร็จ: เจอ ${res.data['rows']} รายการ · ลงใหม่ ${res.data['imported']} รายการ');
    } catch (e) {
      String msg = 'อัปโหลดไม่สำเร็จ';
      if (e is DioException && e.response?.data is Map) {
        msg = '${(e.response!.data as Map)['error'] ?? msg}';
      }
      setState(() => _error = msg);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('นำเข้า e-Statement', style: TextStyle(fontWeight: FontWeight.bold))),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: softCard(),
            child: const Text(
              'อัปโหลดไฟล์ e-Statement (PDF) จากแอปธนาคาร แล้วใส่รหัสเปิดไฟล์ (ถ้ามี — มักเป็นเลขบัตรประชาชน/วันเกิด) ระบบจะแกะรายการมาลงให้อัตโนมัติ',
              style: TextStyle(color: AppColors.textMuted, fontSize: 13),
            ),
          ),
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: _busy ? null : _pick,
            icon: const Icon(Icons.picture_as_pdf_rounded),
            label: Text(_fileName ?? 'เลือกไฟล์ PDF'),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _password,
            obscureText: true,
            decoration: const InputDecoration(
              labelText: 'รหัสเปิด PDF (ถ้ามี)',
              hintText: 'เว้นว่างถ้าไฟล์ไม่ล็อก',
              prefixIcon: Icon(Icons.lock_outline_rounded),
            ),
          ),
          const SizedBox(height: 20),
          ElevatedButton.icon(
            onPressed: (_busy || _bytes == null) ? null : _upload,
            icon: _busy
                ? const SizedBox(
                    width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Icon(Icons.download_rounded),
            label: const Text('นำเข้ารายการ'),
          ),
          if (_result != null) ...[
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.chipBg,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  const Icon(Icons.check_circle_rounded, color: AppColors.primary),
                  const SizedBox(width: 10),
                  Expanded(child: Text(_result!, style: const TextStyle(color: AppColors.textDark))),
                ],
              ),
            ),
          ],
          if (_error != null) ...[
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.expense.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  const Icon(Icons.error_outline_rounded, color: AppColors.expense),
                  const SizedBox(width: 10),
                  Expanded(child: Text(_error!, style: const TextStyle(color: AppColors.expense))),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
