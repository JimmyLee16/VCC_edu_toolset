# Midnight Wallet TUI

Ứng dụng dòng lệnh đơn giản để tạo ví Midnight với mnemonic BIP-39 và địa chỉ Midnight (shielded, unshielded, dust).

## Tính năng

- Sinh mnemonic ngẫu nhiên theo số lượng từ: `12`, `15`, `18`, `21`, `24`
- Chọn network Midnight: `preprod`, `preview`, `mainnet`
- Tạo địa chỉ Midnight dạng:
  - `mn_shield-addr...`
  - `mn_addr...`
  - `mn_dust...`
- Sử dụng `walletgenrator.ts` để tạo địa chỉ thật từ thư viện Midnight SDK

## Cấu trúc chính

- `tui.ts`: giao diện người dùng terminal
- `walletService.ts`: dịch vụ tạo ví Midnight
- `walletgenrator.ts`: logic tạo địa chỉ Midnight thực từ seed phrase
- `mnemonicService.ts`: tạo và kiểm tra mnemonic BIP-39
- `wordlist.ts`: helper tương tác với danh sách từ BIP-39
- `english.ts`: danh sách từ BIP-39 chuẩn tiếng Anh

## Cài đặt

```bash
cd midnight/wallet
npm install
```

## Chạy TUI

```bash
npm start
```

Sau khi chạy, bạn sẽ thấy menu chọn số lượng từ và network, rồi ứng dụng sẽ xuất mnemonic và 3 loại địa chỉ Midnight.

## Lưu ý

- Giữ mnemonic an toàn, không chia sẻ cho người khác.
- Ứng dụng hiện tại dùng Midnight SDK và `ledger-v8` để tạo địa chỉ định dạng đúng.
- Nếu muốn mở rộng, có thể thêm validate mnemonic, import mnemonic sẵn có, hoặc lưu kết quả ra file.
