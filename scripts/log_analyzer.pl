#!/usr/bin/env perl
use strict;
use warnings;
use JSON::PP;
use File::Find;
use File::Basename;

# Game log analyzer for WestWard RPG
# Analyzes output logs and generates statistics

sub analyze_state_files {
    my ($output_dir) = @_;
    
    my @state_files;
    my %scenarios;
    
    find(sub {
        # Match state files with numeric IDs (e.g., state-123.json)
        return unless -f && /^state-\d+\.json$/;
        push @state_files, $File::Find::name;
        
        my $scenario = basename(dirname($File::Find::name));
        $scenarios{$scenario} ||= {
            name => $scenario,
            state_count => 0,
            error_count => 0,
            files => []
        };
        
        $scenarios{$scenario}{state_count}++;
        push @{$scenarios{$scenario}{files}}, $_;
    }, $output_dir) if -d $output_dir;
    
    return \%scenarios;
}

sub analyze_errors {
    my ($output_dir) = @_;
    
    my %error_summary;
    
    find(sub {
        return unless -f && /^errors-\d+\.json$/;
        
        open my $fh, '<', $_ or do {
            warn "Cannot open $_: $!\n";
            return;
        };
        
        my $content = do { local $/; <$fh> };
        close $fh;
        
        eval {
            my $data = decode_json($content);
            if (ref $data eq 'ARRAY') {
                foreach my $error (@$data) {
                    my $type = $error->{type} || 'unknown';
                    $error_summary{$type}++;
                }
            }
        };
        if ($@) {
            warn "Failed to parse JSON in $_: $@\n";
        }
    }, $output_dir) if -d $output_dir;
    
    return \%error_summary;
}

sub generate_report {
    my ($output_dir) = @_;
    
    unless (-d $output_dir) {
        print STDERR "Output directory not found: $output_dir\n";
        return {
            status => 'error',
            message => 'Directory not found'
        };
    }
    
    my $scenarios = analyze_state_files($output_dir);
    my $errors = analyze_errors($output_dir);
    
    my $total_states = 0;
    my $total_scenarios = scalar keys %$scenarios;
    
    foreach my $scenario (values %$scenarios) {
        $total_states += $scenario->{state_count};
    }
    
    my $total_errors = 0;
    foreach my $count (values %$errors) {
        $total_errors += $count;
    }
    
    my $report = {
        output_directory => $output_dir,
        timestamp => scalar localtime,
        summary => {
            total_scenarios => $total_scenarios,
            total_states => $total_states,
            total_errors => $total_errors
        },
        scenarios => [
            map { $scenarios->{$_} } sort keys %$scenarios
        ],
        error_types => $errors
    };
    
    return $report;
}

sub print_report {
    my ($report) = @_;
    
    if (!defined $report->{timestamp}) {
        print "Error: Invalid report structure\n";
        return;
    }
    
    print "=" x 60, "\n";
    print "WestWard RPG Log Analysis Report\n";
    print "=" x 60, "\n";
    print "Timestamp: $report->{timestamp}\n";
    print "Directory: $report->{output_directory}\n";
    print "-" x 60, "\n";
    
    my $summary = $report->{summary};
    print "Summary:\n";
    print "  Scenarios: $summary->{total_scenarios}\n";
    print "  States: $summary->{total_states}\n";
    print "  Errors: $summary->{total_errors}\n";
    print "-" x 60, "\n";
    
    if ($report->{scenarios} && @{$report->{scenarios}}) {
        print "Scenario Details:\n";
        foreach my $scenario (@{$report->{scenarios}}) {
            printf "  %-30s states: %3d\n", 
                   $scenario->{name}, 
                   $scenario->{state_count};
        }
        print "-" x 60, "\n";
    }
    
    if ($report->{error_types} && keys %{$report->{error_types}}) {
        print "Error Types:\n";
        foreach my $type (sort keys %{$report->{error_types}}) {
            printf "  %-30s count: %3d\n", 
                   $type, 
                   $report->{error_types}{$type};
        }
        print "-" x 60, "\n";
    }
}

sub main {
    my $output_dir = $ARGV[0] || 'output';
    my $format = $ARGV[1] || 'text';
    
    my $report = generate_report($output_dir);
    
    if ($format eq 'json') {
        print JSON::PP->new->pretty->encode($report);
    } else {
        print_report($report);
    }
    
    return 0;
}

exit main() unless caller;

1;
