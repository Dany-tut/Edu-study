import SwiftUI

struct ProjectsView: View {
    @State private var searchText = ""
    @StateObject private var iskraMonitor = IskraMonitor()
    private var connectedProjects: [Project] { DemoData.projects.map { $0.id == "iskra" ? iskraMonitor.project($0) : $0 } }
    private var projects: [Project] {
        guard !searchText.isEmpty else { return connectedProjects }
        return connectedProjects.filter { $0.name.localizedCaseInsensitiveContains(searchText) }
    }

    private var healthyCount: Int { DemoData.projects.filter { $0.health == .healthy && $0.name != "Новый проект" }.count }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                portfolioHeader
                summaryGrid
                HStack {
                    Text("Проекты").font(.title3.weight(.bold))
                    Spacer()
                    Text("\(DemoData.projects.count - 1) подключено")
                        .font(.subheadline).foregroundStyle(.secondary)
                }
                LazyVStack(spacing: 12) {
                    ForEach(projects) { project in
                        NavigationLink(value: project.id) {
                            ProjectCard(project: project)
                        }
                        .buttonStyle(.plain)
                    }
                }
                Text("Статус Искры — из серверного источника. Остальные показатели демонстрационные. При недоступном или устаревшем источнике статус не подтверждён.")
                    .font(.footnote).foregroundStyle(.tertiary)
                    .padding(.top, 2)
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
            .padding(.bottom, 24)
        }
        .background(Color(.systemGroupedBackground))
        .task {
            while !Task.isCancelled {
                await iskraMonitor.refresh()
                do { try await Task.sleep(for: .seconds(60)) } catch { break }
            }
        }
        .navigationTitle("Все проекты")
        .navigationBarTitleDisplayMode(.large)
        .searchable(text: $searchText, prompt: "Найти проект")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Image(systemName: "dot.radiowaves.left.and.right")
                    .foregroundStyle(Health.healthy.color)
                    .accessibilityLabel("Мониторинг активен")
            }
        }
        .navigationDestination(for: String.self) { id in
            if let project = connectedProjects.first(where: { $0.id == id }) {
                ProjectDetailView(project: project)
            }
        }
    }

    private var portfolioHeader: some View {
        HStack(spacing: 12) {
            PulseLogoMark()
                .frame(width: 48, height: 48)
            VStack(alignment: .leading, spacing: 3) {
                Text("Pulse").font(.headline)
                Text("Центр управления продуктами").font(.caption).foregroundStyle(.secondary)
            }
            Spacer(minLength: 4)
            HStack(spacing: 6) {
                Circle().fill(Health.healthy.color).frame(width: 7, height: 7)
                Text("Live").font(.caption.weight(.semibold))
            }
            .padding(.horizontal, 10).padding(.vertical, 8)
            .background(Health.healthy.tint, in: Capsule())
        }
        .padding(.vertical, 4)
    }

    private var summaryGrid: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
            SummaryTile(title: "Проектов", value: "9", symbol: "square.grid.2x2", color: .accentColor)
            SummaryTile(title: "В норме", value: "\(healthyCount)", symbol: "checkmark.circle", color: Health.healthy.color)
            SummaryTile(title: "Предупреждения", value: "1", symbol: "exclamationmark.triangle", color: Health.warning.color)
            SummaryTile(title: "Ошибки", value: "1", symbol: "xmark.circle", color: Health.error.color)
        }
    }
}

struct SummaryTile: View {
    let title: String
    let value: String
    let symbol: String
    let color: Color

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: symbol).font(.title3).foregroundStyle(color)
            VStack(alignment: .leading, spacing: 3) {
                Text(value).font(.title3.weight(.bold)).monospacedDigit()
                Text(title).font(.caption).foregroundStyle(.secondary).lineLimit(1)
            }
            Spacer(minLength: 0)
        }
        .padding(13)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 16))
    }
}

struct ProjectCard: View {
    let project: Project

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top, spacing: 10) {
                RoundedRectangle(cornerRadius: 10)
                    .fill(project.health.tint)
                    .frame(width: 40, height: 40)
                    .overlay {
                        Image(systemName: projectSymbol)
                            .font(.system(size: 17, weight: .semibold))
                            .foregroundStyle(project.health.color)
                    }
                VStack(alignment: .leading, spacing: 3) {
                    Text(project.name).font(.headline)
                    Text(project.summary).font(.subheadline).foregroundStyle(.secondary)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.caption.weight(.semibold)).foregroundStyle(.tertiary)
                    .padding(.top, 5)
            }

            HStack(spacing: 7) {
                Circle().fill(project.health.color).frame(width: 7, height: 7)
                Text(project.healthMessage).font(.caption.weight(.medium)).lineLimit(1)
                Spacer(minLength: 0)
            }
            .foregroundStyle(project.health.color)
            .padding(.horizontal, 10).padding(.vertical, 8)
            .background(project.health.tint, in: RoundedRectangle(cornerRadius: 9))

            HStack(spacing: 0) {
                Metric(label: "Доступность", value: project.uptime)
                Metric(label: "Пользователи", value: project.users)
                Metric(label: "Онлайн", value: project.online)
                Metric(label: "Загрузки", value: project.downloads)
            }
        }
        .padding(14)
        .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 18))
        .overlay {
            RoundedRectangle(cornerRadius: 18).stroke(Color(.separator).opacity(0.18), lineWidth: 0.7)
        }
        .contentShape(RoundedRectangle(cornerRadius: 18))
    }

    private var projectSymbol: String {
        switch project.name {
        case "Finansly": "chart.line.uptrend.xyaxis"
        case "Taskly": "checklist"
        case "Новый проект": "plus"
        default: "square.stack.3d.up"
        }
    }
}

struct Metric: View {
    let label: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(label.uppercased()).font(.system(size: 8, weight: .medium)).foregroundStyle(.secondary).lineLimit(1)
            Text(value).font(.system(size: 12, weight: .semibold, design: .rounded)).monospacedDigit().lineLimit(1).minimumScaleFactor(0.8)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
